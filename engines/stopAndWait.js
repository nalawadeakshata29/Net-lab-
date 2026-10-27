/* ============================================================
   engines/stopAndWait.js
   Pure simulation logic — no UI, no React, no DOM.

   INPUT:  { frames, timeout, lossProb }
   OUTPUT: Array of step objects, each with:
     { t, type, frame, msg }

   TYPES:
     'SEND'    — sender transmits a frame
     'ACK'     — ACK received successfully
     'LOSS'    — ACK was lost in transit
     'TIMEOUT' — timeout expired, will retransmit
     'DONE'    — all frames delivered

   To modify loss behavior, edit the lossProb check below.
   To add bit-error simulation, add a separate ERR type here.
   ============================================================ */

function createSAWSteps({ frames, timeout, lossProb }) {
  const steps = [];
  let t = 0; // logical time counter

  for (let frame = 0; frame < frames; frame++) {
    let delivered = false;

    // Keep trying until this frame is acknowledged
    while (!delivered) {
      // Step 1: Sender transmits frame
      steps.push({
        t: t++,
        type: 'SEND',
        frame,
        msg: `Frame ${frame} sent →`
      });

      // Step 2: Randomly decide if ACK is lost
      const ackLost = Math.random() < lossProb;

      if (ackLost) {
        // ACK was dropped somewhere in the network
        steps.push({
          t: t++,
          type: 'LOSS',
          frame,
          msg: `ACK for Frame ${frame} lost in transit`
        });

        // Timeout fires — sender will retransmit
        steps.push({
          t: t++,
          type: 'TIMEOUT',
          frame,
          msg: `Timeout! Resending Frame ${frame}`
        });

      } else {
        // ACK received successfully — move to next frame
        steps.push({
          t: t++,
          type: 'ACK',
          frame,
          msg: `ACK ${frame} received ✓`
        });
        delivered = true;
      }
    }
  }

  // Final step marking simulation complete
  steps.push({
    t: t,
    type: 'DONE',
    frame: -1,
    msg: `All ${frames} frames delivered successfully`
  });

  return steps;
}

// ── Canvas drawing helpers for Stop-and-Wait timeline ────────

function drawSAWCanvas(canvas, steps, stepIdx) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // Clear and fill background
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  const senderX = 80;
  const receiverX = W - 80;
  const entityY = 60;
  const entityH = 320;

  // Draw sender/receiver boxes and timelines
  _drawEntity(ctx, senderX, entityY, entityH, 'SENDER');
  _drawEntity(ctx, receiverX, entityY, entityH, 'RECEIVER');

  if (stepIdx < 0 || !steps.length) return;

  const slotH = Math.min(42, entityH / Math.max(steps.length, 1));

  steps.slice(0, stepIdx + 1).forEach((s, i) => {
    const y = entityY + 30 + i * slotH;
    if (y > entityY + entityH) return;

    if (s.type === 'SEND') {
      _drawArrow(ctx, senderX + 48, y, receiverX - 48, y, '#3b82f6');
      ctx.font = '600 11px JetBrains Mono';
      ctx.fillStyle = '#2563eb';
      ctx.textAlign = 'center';
      ctx.fillText(`F${s.frame}`, (senderX + receiverX) / 2, y - 6);

    } else if (s.type === 'ACK') {
      _drawArrow(ctx, receiverX - 48, y, senderX + 48, y, '#10b981');
      ctx.font = '600 11px JetBrains Mono';
      ctx.fillStyle = '#10b981';
      ctx.textAlign = 'center';
      ctx.fillText(`ACK${s.frame}`, (senderX + receiverX) / 2, y - 6);

    } else if (s.type === 'LOSS') {
      const midX = (senderX + receiverX) / 2;
      // Dashed line to midpoint (packet dropped)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(senderX + 48, y); ctx.lineTo(midX, y); ctx.stroke();
      ctx.setLineDash([]);
      // X mark at drop point
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(midX - 6, y - 6); ctx.lineTo(midX + 6, y + 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(midX + 6, y - 6); ctx.lineTo(midX - 6, y + 6); ctx.stroke();
      ctx.font = '600 11px JetBrains Mono';
      ctx.fillStyle = '#ef4444'; ctx.textAlign = 'center';
      ctx.fillText('ACK LOST', midX, y - 9);

    } else if (s.type === 'TIMEOUT') {
      ctx.font = '600 11px JetBrains Mono';
      ctx.fillStyle = '#f59e0b'; ctx.textAlign = 'left';
      ctx.fillText(`⟳ Timeout → Resend F${s.frame}`, senderX - 40, y + 4);

    } else if (s.type === 'DONE') {
      ctx.font = '700 13px Inter';
      ctx.fillStyle = '#10b981'; ctx.textAlign = 'center';
      ctx.fillText('✓ All frames delivered', W / 2, y + 4);
    }
  });
}

function _drawEntity(ctx, x, entityY, entityH, label) {
  const bw = 90, bh = 36;
  ctx.fillStyle = '#f1f5f9';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - bw / 2, entityY - bh / 2, bw, bh, 8);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#334155';
  ctx.font = '700 13px Inter';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, entityY + 4);
  // Dashed timeline
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, entityY + bh / 2);
  ctx.lineTo(x, entityY + entityH);
  ctx.stroke();
  ctx.setLineDash([]);
}

function _drawArrow(ctx, x1, y1, x2, y2, color) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 8 * Math.cos(angle - 0.4), y2 - 8 * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - 8 * Math.cos(angle + 0.4), y2 - 8 * Math.sin(angle + 0.4));
  ctx.closePath(); ctx.fill();
}
