/* ============================================================
   engines/goBackN.js
   Pure simulation logic — no UI, no React, no DOM.

   INPUT:  { frames, windowSize, lossProb }
   OUTPUT: Array of step objects, each with:
     { t, type, frame, base, nextSeq, windowEnd, msg }

   TYPES:
     'SEND' — a frame inside the window is transmitted
     'ACK'  — base frame acknowledged, window slides forward
     'LOSS' — base frame lost, nextSeq reset to base (Go-Back-N)
     'DONE' — all frames delivered

   To convert this into Selective Repeat:
     - On LOSS, only retransmit the lost frame (not the whole window)
     - Add a receiver buffer to hold out-of-order frames
   ============================================================ */

function createGBNSteps({ frames, windowSize, lossProb }) {
  const steps = [];
  let base = 0;      // oldest unacknowledged frame
  let nextSeq = 0;   // next frame to send
  let t = 0;         // logical time

  const MAX_ITERATIONS = frames * 12; // safety limit to avoid infinite loops
  let iter = 0;

  while (base < frames && iter++ < MAX_ITERATIONS) {
    const windowEnd = Math.min(base + windowSize, frames);

    // ── Transmit all frames currently in the window ──────────
    while (nextSeq < windowEnd) {
      steps.push({
        t: t++,
        type: 'SEND',
        frame: nextSeq,
        base,
        nextSeq,
        windowEnd,
        msg: `Frame ${nextSeq} sent  [window: ${base}..${windowEnd - 1}]`
      });
      nextSeq++;
    }

    // ── Wait for ACK of base frame ───────────────────────────
    const lost = Math.random() < lossProb;

    if (lost) {
      steps.push({
        t: t++,
        type: 'LOSS',
        frame: base,
        base,
        nextSeq,
        windowEnd,
        msg: `Frame ${base} lost! Go-Back-N: retransmit from Frame ${base}`
      });
      // KEY Go-Back-N behavior: reset nextSeq to base
      nextSeq = base;

    } else {
      steps.push({
        t: t++,
        type: 'ACK',
        frame: base,
        base,
        nextSeq,
        windowEnd,
        msg: `ACK ${base} received ✓ — window slides to [${base + 1}..${Math.min(base + windowSize, frames) - 1}]`
      });
      base++; // slide window forward
    }
  }

  steps.push({
    t: t,
    type: 'DONE',
    frame: -1,
    base: frames,
    msg: `All ${frames} frames delivered. Total events: ${t}`
  });

  return steps;
}

// ── Compute per-frame display state from step history ────────
// Returns array of: 'waiting' | 'sent' | 'acked' | 'lost' | 'retx'
function getGBNFrameStates(steps, stepIdx, frames) {
  if (!steps.length || stepIdx < 0) return new Array(frames).fill('waiting');

  const state = new Array(frames).fill('waiting');

  steps.slice(0, stepIdx + 1).forEach(s => {
    if (s.type === 'SEND' && s.frame < frames) state[s.frame] = 'sent';
    if (s.type === 'ACK'  && s.frame < frames) state[s.frame] = 'acked';
    if (s.type === 'LOSS' && s.frame !== undefined) {
      state[s.frame] = 'lost';
      // Mark all subsequent sent frames as needing retransmission
      for (let f = s.frame + 1; f < frames; f++) {
        if (state[f] === 'sent') state[f] = 'retx';
      }
    }
  });

  return state;
}

// ── Canvas drawing for Go-Back-N timeline ────────────────────

function drawGBNCanvas(canvas, steps, stepIdx) {
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
  const slotH = Math.min(42, (H - 90) / Math.max(steps.length, 1));

  // Entity nodes + dashed timelines
  _drawGBNEntity(ctx, sX, startY, steps, stepIdx, slotH, 'SENDER');
  _drawGBNEntity(ctx, rX, startY, steps, stepIdx, slotH, 'RECEIVER');

  // Draw each step arrow
  steps.slice(0, stepIdx + 1).forEach((s, i) => {
    const y = startY + 30 + i * slotH;
    if (y > H - 20) return;

    if (s.type === 'SEND') {
      _gbnArrow(ctx, sX + 50, y, rX - 50, y, '#3b82f6');
      ctx.font = '600 10px JetBrains Mono'; ctx.fillStyle = '#2563eb'; ctx.textAlign = 'center';
      ctx.fillText(`F${s.frame}`, (sX + rX) / 2, y - 5);

    } else if (s.type === 'ACK') {
      _gbnArrow(ctx, rX - 50, y, sX + 50, y, '#10b981');
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
      ctx.fillText(`F${s.frame} LOST → Go-Back-N`, mx, y - 8);

    } else if (s.type === 'DONE') {
      ctx.font = '700 13px Inter'; ctx.fillStyle = '#10b981'; ctx.textAlign = 'center';
      ctx.fillText('✓ All frames delivered', W / 2, y + 4);
    }
  });
}

function _drawGBNEntity(ctx, x, startY, steps, stepIdx, slotH, label) {
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

function _gbnArrow(ctx, x1, y1, x2, y2, color) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const d = x2 > x1 ? 1 : -1;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - d * 8, y2 - 5);
  ctx.lineTo(x2 - d * 8, y2 + 5);
  ctx.closePath(); ctx.fill();
}
