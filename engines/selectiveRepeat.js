/* ============================================================
   engines/selectiveRepeat.js
   Pure simulation logic for Selective Repeat ARQ.

   INPUT:  { frames, windowSize, lossProb }
   OUTPUT: Array of step objects.

   Selective Repeat differences:
     - On LOSS, ONLY the lost frame is retransmitted.
     - Receiver has a buffer to hold out-of-order frames.
     - ACKs are individual (or we simulate them as such).
   ============================================================ */

function createSRSteps({ frames, windowSize, lossProb }) {
  const steps = [];
  let base = 0;           // oldest unacknowledged frame at sender
  let nextSeq = 0;        // next frame to send
  let t = 0;              // logical time
  
  const sent = new Array(frames).fill(false);
  const acked = new Array(frames).fill(false);
  const received = new Array(frames).fill(false); // Receiver buffer

  const MAX_ITERATIONS = frames * 20; 
  let iter = 0;

  while (base < frames && iter++ < MAX_ITERATIONS) {
    const windowEnd = Math.min(base + windowSize, frames);

    // ── Transmit available frames in the window ──────────
    // In SR, we can send any frame in the window that hasn't been sent yet
    // OR any frame that needs retransmission (we'll prioritize oldest unsent)
    
    let sentSomething = false;
    for (let f = base; f < windowEnd; f++) {
      if (!sent[f]) {
        steps.push({
          t: t++,
          type: 'SEND',
          frame: f,
          base,
          windowEnd,
          msg: `Frame ${f} sent [window: ${base}..${windowEnd - 1}]`
        });
        sent[f] = true;
        sentSomething = true;
        
        // Simulate channel
        const lost = Math.random() < lossProb;
        if (lost) {
          steps.push({
            t: t++,
            type: 'LOSS',
            frame: f,
            base,
            windowEnd,
            msg: `Frame ${f} lost in transit!`
          });
          // In SR, we'll eventually timeout and retransmit just this frame
          // For this discrete simulation, we'll immediately "schedule" a retransmission
          // by marking it as not sent after the loss event.
          sent[f] = false; 
        } else {
          received[f] = true;
          steps.push({
            t: t++,
            type: 'ACK',
            frame: f,
            base,
            windowEnd,
            msg: `ACK ${f} received ✓`
          });
          acked[f] = true;
          
          // Slide window if base is acked
          let oldBase = base;
          while (base < frames && acked[base]) {
            base++;
          }
          if (base > oldBase) {
             steps.push({
               t: t++,
               type: 'SLIDE',
               frame: -1,
               base,
               windowEnd: Math.min(base + windowSize, frames),
               msg: `Window slides to [${base}..${Math.min(base + windowSize, frames) - 1}]`
             });
          }
        }
        // In this simplified step-by-step logic, we process one frame's fate at a time
        // to keep the visualization clear.
        break; 
      }
    }
  }

  steps.push({
    t: t,
    type: 'DONE',
    frame: -1,
    base: frames,
    msg: `All ${frames} frames delivered successfully.`
  });

  return steps;
}

function getSRFrameStates(steps, stepIdx, frames) {
  if (!steps.length || stepIdx < 0) return new Array(frames).fill('waiting');

  const state = new Array(frames).fill('waiting');

  steps.slice(0, stepIdx + 1).forEach(s => {
    if (s.type === 'SEND' && s.frame >= 0) {
       if (state[s.frame] === 'lost') state[s.frame] = 'retx';
       else state[s.frame] = 'sent';
    }
    if (s.type === 'ACK'  && s.frame >= 0) state[s.frame] = 'acked';
    if (s.type === 'LOSS' && s.frame >= 0) state[s.frame] = 'lost';
  });

  return state;
}

function drawSRCanvas(canvas, steps, stepIdx) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  if (stepIdx < 0 || !steps.length) {
    ctx.fillStyle = '#64748b';
    ctx.font = '500 14px Inter'; ctx.textAlign = 'center';
    ctx.fillText('Press "Start Simulation" to begin', W / 2, H / 2);
    return;
  }

  const sX = 70, rX = W - 70;
  const startY = 60;
  
  // Calculate slot height dynamically to fit all steps
  const visibleSteps = steps.slice(0, stepIdx + 1);
  const slotH = Math.min(40, (H - 100) / Math.max(visibleSteps.length, 1));

  _drawSREntity(ctx, sX, startY, steps, stepIdx, slotH, 'SENDER');
  _drawSREntity(ctx, rX, startY, steps, stepIdx, slotH, 'RECEIVER');

  visibleSteps.forEach((s, i) => {
    const y = startY + 30 + i * slotH;
    if (y > H - 20) return;

    if (s.type === 'SEND') {
      _srArrow(ctx, sX + 50, y, rX - 50, y, '#3b82f6');
      ctx.font = '600 10px JetBrains Mono'; ctx.fillStyle = '#2563eb'; ctx.textAlign = 'center';
      ctx.fillText(`F${s.frame}`, (sX + rX) / 2, y - 5);

    } else if (s.type === 'ACK') {
      _srArrow(ctx, rX - 50, y, sX + 50, y, '#10b981');
      ctx.font = '600 10px JetBrains Mono'; ctx.fillStyle = '#10b981'; ctx.textAlign = 'center';
      ctx.fillText(`ACK${s.frame}`, (sX + rX) / 2, y - 5);

    } else if (s.type === 'LOSS') {
      const mx = (sX + rX) / 2;
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(sX + 50, y); ctx.lineTo(mx, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx - 6, y - 6); ctx.lineTo(mx + 6, y + 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx + 6, y - 6); ctx.lineTo(mx - 6, y + 6); ctx.stroke();
      ctx.font = '600 10px JetBrains Mono'; ctx.fillStyle = '#ef4444'; ctx.textAlign = 'center';
      ctx.fillText(`F${s.frame} LOST`, mx, y - 8);

    } else if (s.type === 'SLIDE') {
       ctx.setLineDash([2, 2]);
       ctx.strokeStyle = '#e2e8f0';
       ctx.beginPath(); ctx.moveTo(sX - 20, y); ctx.lineTo(rX + 20, y); ctx.stroke();
       ctx.setLineDash([]);
       ctx.font = 'italic 10px Inter'; ctx.fillStyle = '#64748b'; ctx.textAlign = 'center';
       ctx.fillText(`Window slides to base ${s.base}`, W / 2, y - 4);

    } else if (s.type === 'DONE') {
      ctx.font = '700 13px Inter'; ctx.fillStyle = '#10b981'; ctx.textAlign = 'center';
      ctx.fillText('✓ All frames delivered (Selective Repeat)', W / 2, y + 4);
    }
  });
}

function _drawSREntity(ctx, x, startY, steps, stepIdx, slotH, label) {
  ctx.fillStyle = '#f1f5f9'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x - 48, startY - 18, 96, 36, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#334155'; ctx.font = '700 12px Inter'; ctx.textAlign = 'center';
  ctx.fillText(label, x, startY + 4);
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, startY + 18);
  ctx.lineTo(x, startY + 30 + stepIdx * slotH + 20);
  ctx.stroke();
  ctx.setLineDash([]);
}

function _srArrow(ctx, x1, y1, x2, y2, color) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const d = x2 > x1 ? 1 : -1;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - d * 8, y2 - 5);
  ctx.lineTo(x2 - d * 8, y2 + 5);
  ctx.closePath(); ctx.fill();
}
