/* ============================================================
   engines/arqError.js
   Logic for ARQ with Error Detection (Parity / CRC).
   ============================================================ */

function createARQErrorSteps({ frames, errorProb, detectionType }) {
  const steps = [];
  let t = 0;

  for (let frame = 0; frame < frames; frame++) {
    let delivered = false;
    // Generate some random 8-bit data for visualization
    const originalData = Math.floor(Math.random() * 256).toString(2).padStart(8, '0');
    
    let encodedData = '';
    let checksum = '';

    if (detectionType === 'Parity') {
      const ones = originalData.split('1').length - 1;
      checksum = (ones % 2 === 0) ? '0' : '1';
      encodedData = originalData + checksum;
    } else {
      // Simple CRC-3 (Polynomial x^3 + x + 1 -> 1011)
      // This is a simplified simulation of CRC
      const dataInt = parseInt(originalData, 2);
      const poly = 0xB; // 1011
      let remainder = (dataInt << 3);
      for (let i = 7; i >= 0; i--) {
        if ((remainder >> (i + 3)) & 1) {
          remainder ^= (poly << i);
        }
      }
      checksum = (remainder & 0x7).toString(2).padStart(3, '0');
      encodedData = originalData + checksum;
    }

    while (!delivered) {
      steps.push({
        t: t++,
        type: 'SEND',
        frame,
        originalData,
        encodedData,
        checksum,
        msg: `Sending Frame ${frame} with ${detectionType}: [${encodedData}]`
      });

      // Randomly decide if bit error occurs
      const hasError = Math.random() < errorProb;
      let receivedData = encodedData;
      
      if (hasError) {
        // Flip a random bit
        const bitToFlip = Math.floor(Math.random() * encodedData.length);
        const bits = encodedData.split('');
        bits[bitToFlip] = bits[bitToFlip] === '0' ? '1' : '0';
        receivedData = bits.join('');

        steps.push({
          t: t++,
          type: 'ERROR',
          frame,
          receivedData,
          msg: `Bit error occurred! Received: [${receivedData}]`
        });

        steps.push({
          t: t++,
          type: 'RETRANSMIT',
          frame,
          msg: `Receiver detected error! Requesting retransmission...`
        });
      } else {
        steps.push({
          t: t++,
          type: 'ACK',
          frame,
          msg: `Frame ${frame} received correctly ✓`
        });
        delivered = true;
      }
    }
  }

  steps.push({
    t: t,
    type: 'DONE',
    frame: -1,
    msg: `All ${frames} frames verified and delivered.`
  });

  return steps;
}

function drawARQErrorCanvas(canvas, steps, stepIdx) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const sX = 80, rX = W - 80;
  const startY = 60;
  
  // Draw Entities
  _drawEntity(ctx, sX, startY, 320, 'SENDER');
  _drawEntity(ctx, rX, startY, 320, 'RECEIVER');

  if (stepIdx < 0 || !steps.length) return;

  const slotH = Math.min(40, 300 / Math.max(steps.length, 1));

  steps.slice(0, stepIdx + 1).forEach((s, i) => {
    const y = startY + 30 + i * slotH;
    if (y > H - 20) return;

    if (s.type === 'SEND') {
      _drawArrow(ctx, sX + 48, y, rX - 48, y, '#3b82f6');
      ctx.font = '600 10px JetBrains Mono'; ctx.fillStyle = '#2563eb'; ctx.textAlign = 'center';
      ctx.fillText(`F${s.frame}`, (sX + rX) / 2, y - 5);
    } else if (s.type === 'ERROR') {
      const mx = (sX + rX) / 2;
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(mx - 6, y - 6); ctx.lineTo(mx + 6, y + 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx + 6, y - 6); ctx.lineTo(mx - 6, y + 6); ctx.stroke();
      ctx.font = '600 10px JetBrains Mono'; ctx.fillStyle = '#ef4444'; ctx.textAlign = 'center';
      ctx.fillText(`BIT ERROR`, mx, y - 10);
    } else if (s.type === 'RETRANSMIT') {
      _drawArrow(ctx, rX - 48, y, sX + 48, y, '#f59e0b');
      ctx.font = '600 10px JetBrains Mono'; ctx.fillStyle = '#d97706'; ctx.textAlign = 'center';
      ctx.fillText(`NACK${s.frame}`, (sX + rX) / 2, y - 5);
    } else if (s.type === 'ACK') {
      _drawArrow(ctx, rX - 48, y, sX + 48, y, '#10b981');
      ctx.font = '600 10px JetBrains Mono'; ctx.fillStyle = '#10b981'; ctx.textAlign = 'center';
      ctx.fillText(`ACK${s.frame}`, (sX + rX) / 2, y - 5);
    } else if (s.type === 'DONE') {
      ctx.font = '700 13px Inter'; ctx.fillStyle = '#10b981'; ctx.textAlign = 'center';
      ctx.fillText('✓ Completed', W / 2, y + 4);
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
