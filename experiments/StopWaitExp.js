(function(){
/* ============================================================
   experiments/StopWaitExp.js
   ============================================================ */

const { useState, useEffect, useRef, useMemo } = React;

function StopWaitExp() {
  // Pull components from window explicitly to avoid scoping issues
  const { LogPanel, StatsStrip, QuizPanel } = window;

  const [frames,    setFrames]    = useState(5);
  const [lossProb,  setLossProb]  = useState(0.3);
  const [speed,     setSpeed]     = useState(60);
  const [autoMode,  setAutoMode]  = useState(true);

  const [steps,    setSteps]    = useState([]);
  const [stepIdx,  setStepIdx]  = useState(-1);
  const [running,  setRunning]  = useState(false);
  const [logs,     setLogs]     = useState([]);

  const canvasRef = useRef(null);
  const accum     = useRef(0);

  const stats = useMemo(() => {
    const slice = steps.slice(0, stepIdx + 1);
    const acks   = slice.filter(s => s.type === 'ACK').length;
    const losses = slice.filter(s => s.type === 'LOSS').length;
    const retx   = slice.filter(s => s.type === 'TIMEOUT').length;
    const eff    = slice.length > 0 ? Math.round(acks / Math.max(slice.length, 1) * 100) : null;
    return [
      { value: acks,              label: 'FRAMES ACKED',      colorClass: 'blue' },
      { value: losses,            label: 'PACKETS LOST',      colorClass: 'red' },
      { value: retx,              label: 'RETRANSMISSIONS',   colorClass: 'yellow' },
      { value: eff !== null ? eff + '%' : '—', label: 'EFFICIENCY', colorClass: 'green' },
    ];
  }, [steps, stepIdx]);

  const start = () => {
    const s = createSAWSteps({ frames, timeout: 3, lossProb });
    setSteps(s); setStepIdx(-1); setLogs([]); setRunning(autoMode);
    accum.current = 0;
  };

  useAnimLoop((dt) => {
    if (!autoMode || !steps.length) return;
    accum.current += dt;
    const msPerStep = 1200 - speed * 10;
    if (accum.current >= msPerStep) {
      accum.current = 0;
      setStepIdx(prev => {
        const next = prev + 1;
        if (next >= steps.length) { setRunning(false); return prev; }
        _pushLog(steps[next]);
        return next;
      });
    }
  }, running && autoMode);

  const nextStep = () => {
    const next = stepIdx + 1;
    if (next >= steps.length) return;
    setStepIdx(next);
    _pushLog(steps[next]);
  };

  const _pushLog = (s) => {
    const cls = s.type === 'ACK' ? 'ack' : s.type === 'LOSS' ? 'loss'
              : s.type === 'TIMEOUT' ? 'timeout' : s.type === 'SEND' ? 'send' : 'info';
    setLogs(l => [...l, { t: s.t, msg: s.msg, cls }]);
  };

  useEffect(() => {
    if (canvasRef.current) drawSAWCanvas(canvasRef.current, steps, stepIdx);
  }, [steps, stepIdx]);

  const reset = () => {
    setSteps([]); setStepIdx(-1); setLogs([]); setRunning(false);
    if (canvasRef.current) drawSAWCanvas(canvasRef.current, [], -1);
  };

  return React.createElement('div', null,
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Experiment Overview'),
      React.createElement('div', { className: 'theory-block' },
        React.createElement('h3', { className: 'card-title' }, '🎯 Aim'),
        React.createElement('p', { className: 'theory-text' }, 'To study and simulate the working of the Stop-and-Wait Automatic Repeat Request (ARQ) protocol and understand how it handles data-link layer flow control and error recovery.')
      ),
      React.createElement('div', { className: 'divider' }),
      React.createElement('div', { className: 'theory-block' },
        React.createElement('h3', { className: 'card-title' }, '📚 Theory'),
        React.createElement('p', { className: 'theory-text' }, 'Stop-and-Wait ARQ is the simplest flow control protocol. The sender transmits one frame and then stops to wait for an Acknowledgement (ACK) from the receiver.')
      ),
      React.createElement('div', { className: 'divider' }),
      React.createElement('div', { className: 'theory-block' },
        React.createElement('h3', { className: 'card-title' }, '🛠 Procedure'),
        React.createElement('ol', { className: 'theory-text', style: { paddingLeft: '20px' } },
          React.createElement('li', null, 'Set the "Number of Frames" to transmit using the slider.'),
          React.createElement('li', null, 'Adjust the "Loss Probability" to simulate noisy channel conditions.'),
          React.createElement('li', null, 'Click "Start Simulation" and observe the Timeline Visualization.')
        )
      )
    ),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Parameters'),
      React.createElement('div', { className: 'controls-grid' },
        React.createElement('div', { className: 'ctrl' },
          React.createElement('label', null, 'Number of Frames', React.createElement('span', null, frames)),
          React.createElement('input', { type: 'range', min: 2, max: 10, value: frames, onChange: e => setFrames(+e.target.value) })
        ),
        React.createElement('div', { className: 'ctrl' },
          React.createElement('label', null, 'Loss Probability', React.createElement('span', null, (lossProb * 100).toFixed(0) + '%')),
          React.createElement('input', { type: 'range', min: 0, max: 80, value: lossProb * 100, onChange: e => setLossProb(e.target.value / 100) })
        ),
        React.createElement('div', { className: 'ctrl' },
          React.createElement('label', null, 'Execution Mode'),
          React.createElement('select', { value: autoMode ? 'auto' : 'step', onChange: e => setAutoMode(e.target.value === 'auto') },
            React.createElement('option', { value: 'auto' }, 'Auto-Run'),
            React.createElement('option', { value: 'step' }, 'Step-by-Step')
          )
        ),
        React.createElement('div', { className: 'ctrl' },
          React.createElement('label', null, 'Simulation Speed', React.createElement('span', null, speed + 'x')),
          React.createElement('input', { type: 'range', min: 10, max: 100, value: speed, onChange: e => setSpeed(+e.target.value) })
        )
      ),
      React.createElement('div', { className: 'btn-row', style: { marginTop: 14 } },
        React.createElement('button', { className: 'btn btn-primary', onClick: start }, '▶ Start Simulation'),
        !autoMode && React.createElement('button', { className: 'btn btn-secondary', onClick: nextStep, disabled: !steps.length || stepIdx >= steps.length - 1 }, '→ Next Step'),
        autoMode && steps.length > 0 && React.createElement('button', { className: 'btn btn-secondary', onClick: () => setRunning(r => !r) }, running ? '⏸ Pause' : '▶ Resume'),
        React.createElement('button', { className: 'btn btn-danger', onClick: reset }, '↺ Reset')
      )
    ),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Timeline Visualization'),
      React.createElement('div', { className: 'viz-wrap' },
        React.createElement('canvas', { ref: canvasRef, width: 720, height: 420, style: { width: '100%', height: 'auto' } })
      )
    ),

    steps.length > 0 ? React.createElement(StatsStrip, { stats }) : null,

    React.createElement('div', { className: 'card', style: { marginTop: 16 } },
      React.createElement('div', { className: 'section-label' }, 'Event Log'),
      React.createElement(LogPanel, { logs })
    ),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Self-Assessment Quiz'),
      React.createElement(QuizPanel, {
        questions: [
          {
            q: 'In Stop-and-Wait ARQ, how many frames can be in transit at a single time?',
            options: ['Only 1', 'Up to 5', 'Depends on window size', 'Unlimited'],
            correct: 0,
            hint: 'The protocol "stops and waits" after every single transmission.'
          },
          {
            q: 'What happens if a frame is lost in Stop-and-Wait?',
            options: ['Sender sends the next frame', 'Receiver sends a NACK', 'Sender retransmits after a timeout', 'The connection is terminated'],
            correct: 2,
            hint: 'The sender starts a timer after sending; if no ACK arrives before it expires, it assumes loss.'
          },
          {
            q: 'What is the primary disadvantage of Stop-and-Wait ARQ?',
            options: ['Too complex', 'Low efficiency on long-distance links', 'Requires massive buffers', 'It is insecure'],
            correct: 1,
            hint: 'Most of the time is spent waiting for the ACK to travel back, leaving the link idle.'
          },
          {
            q: 'Why are sequence numbers (0 and 1) necessary in Stop-and-Wait?',
            options: ['To encrypt data', 'To handle lost or delayed ACKs', 'To speed up the link', 'They are not necessary'],
            correct: 1,
            hint: 'Without sequence numbers, the receiver cannot tell if a frame is a new one or a duplicate of the previous one.'
          },
          {
            q: 'If the Round Trip Time (RTT) increases, what happens to SAW efficiency?',
            options: ['Efficiency increases', 'Efficiency decreases', 'Efficiency stays same', 'Link speed doubles'],
            correct: 1,
            hint: 'Since the sender must wait for the RTT before sending again, a longer wait means the link is idle longer.'
          }
        ]
      })
    )
  );
}

window.StopWaitExp = StopWaitExp;
})();