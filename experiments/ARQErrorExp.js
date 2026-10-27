(function(){
/* ============================================================
   experiments/ARQErrorExp.js
   ARQ with Error Detection (Parity / CRC)
   ============================================================ */

const { useState, useEffect, useRef, useMemo } = React;

function ARQErrorExp() {
  const { LogPanel, StatsStrip, QuizPanel } = window;

  const [frames,      setFrames]      = useState(5);
  const [errorProb,   setErrorProb]   = useState(0.3);
  const [detection,   setDetection]   = useState('Parity');
  const [speed,       setSpeed]       = useState(60);
  const [autoMode,    setAutoMode]    = useState(true);

  const [steps,       setSteps]       = useState([]);
  const [stepIdx,     setStepIdx]     = useState(-1);
  const [running,     setRunning]     = useState(false);
  const [logs,        setLogs]        = useState([]);

  const canvasRef = useRef(null);
  const accum     = useRef(0);

  const stats = useMemo(() => {
    const slice = steps.slice(0, stepIdx + 1);
    const total = slice.filter(s => s.type === 'SEND').length;
    const errors = slice.filter(s => s.type === 'ERROR').length;
    const acks = slice.filter(s => s.type === 'ACK').length;
    return [
      { value: acks,    label: 'SUCCESSFUL',    colorClass: 'green' },
      { value: errors,  label: 'ERRORS DETECTED', colorClass: 'red' },
      { value: total,   label: 'TOTAL ATTEMPTS',  colorClass: 'blue' }
    ];
  }, [steps, stepIdx]);

  const start = () => {
    const s = createARQErrorSteps({ frames, errorProb, detectionType: detection });
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

  const _pushLog = (s) => {
    const cls = s.type === 'ACK' ? 'ack' : s.type === 'ERROR' ? 'loss'
              : s.type === 'RETRANSMIT' ? 'timeout' : s.type === 'SEND' ? 'send' : 'info';
    setLogs(l => [...l, { t: s.t, msg: s.msg, cls }]);
  };

  useEffect(() => {
    if (canvasRef.current) drawARQErrorCanvas(canvasRef.current, steps, stepIdx);
  }, [steps, stepIdx]);

  const currentFrameData = useMemo(() => {
    if (stepIdx < 0 || !steps[stepIdx]) return null;
    const s = steps[stepIdx];
    if (s.originalData) return s;
    // Find last SEND step to get data
    for (let i = stepIdx; i >= 0; i--) {
      if (steps[i].originalData) return steps[i];
    }
    return null;
  }, [steps, stepIdx]);

  return React.createElement('div', null,
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Error Detection ARQ'),
      React.createElement('div', { className: 'theory-block' },
        React.createElement('h3', { className: 'card-title' }, '🎯 Aim'),
        React.createElement('p', { className: 'theory-text' }, 'To demonstrate how Error Detection (Parity/CRC) triggers retransmission in an ARQ system.')
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
          React.createElement('label', null, 'Bit Error Probability', React.createElement('span', null, (errorProb * 100).toFixed(0) + '%')),
          React.createElement('input', { type: 'range', min: 0, max: 80, value: errorProb * 100, onChange: e => setErrorProb(e.target.value / 100) })
        ),
        React.createElement('div', { className: 'ctrl' },
          React.createElement('label', null, 'Detection Method'),
          React.createElement('select', { value: detection, onChange: e => setDetection(e.target.value) },
            React.createElement('option', { value: 'Parity' }, 'Simple Parity'),
            React.createElement('option', { value: 'CRC' }, 'CRC (Cyclic Redundancy Check)')
          )
        ),
        React.createElement('div', { className: 'ctrl' },
          React.createElement('label', null, 'Simulation Speed', React.createElement('span', null, speed + 'x')),
          React.createElement('input', { type: 'range', min: 10, max: 100, value: speed, onChange: e => setSpeed(+e.target.value) })
        )
      ),
      React.createElement('div', { className: 'btn-row', style: { marginTop: 14 } },
        React.createElement('button', { className: 'btn btn-primary', onClick: start }, '▶ Start Simulation'),
        React.createElement('button', { className: 'btn btn-danger', onClick: () => { setSteps([]); setStepIdx(-1); setLogs([]); setRunning(false); } }, '↺ Reset')
      )
    ),

    currentFrameData && React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Data Analysis'),
      React.createElement('div', { style: { display: 'flex', gap: '20px', flexWrap: 'wrap' } },
        React.createElement('div', null,
          React.createElement('strong', null, 'Original Data: '),
          React.createElement('code', { style: { color: 'var(--blue)' } }, currentFrameData.originalData)
        ),
        React.createElement('div', null,
          React.createElement('strong', null, 'With ' + detection + ': '),
          React.createElement('code', { style: { color: 'var(--green)' } }, currentFrameData.encodedData)
        ),
        steps[stepIdx].receivedData && React.createElement('div', null,
          React.createElement('strong', null, 'Received (Corrupted): '),
          React.createElement('code', { style: { color: 'var(--red)' } }, steps[stepIdx].receivedData)
        )
      )
    ),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Timeline Visualization'),
      React.createElement('canvas', { ref: canvasRef, width: 720, height: 400, style: { width: '100%', height: 'auto', background: '#fff' } })
    ),

    steps.length > 0 && React.createElement(StatsStrip, { stats }),

    React.createElement('div', { className: 'card', style: { marginTop: 16 } },
      React.createElement('div', { className: 'section-label' }, 'Event Log'),
      React.createElement(LogPanel, { logs })
    ),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Self-Assessment'),
      React.createElement(QuizPanel, {
        questions: [
          {
            q: 'Which error detection method is generally more robust?',
            options: ['Simple Parity', 'CRC', 'None', 'Both are equal'],
            correct: 1,
            hint: 'CRC can detect more complex burst errors than simple parity.'
          },
          {
            q: 'If a receiver detects an error using CRC, what is the typical ARQ action?',
            options: ['Discard and wait', 'Correct the bit', 'Request retransmission (NACK)', 'Send ACK anyway'],
            correct: 2,
            hint: 'ARQ stands for Automatic Repeat Request.'
          }
        ]
      })
    )
  );
}

window.ARQErrorExp = ARQErrorExp;
})();
