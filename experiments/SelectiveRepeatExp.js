(function(){
/* ============================================================
   experiments/SelectiveRepeatExp.js
   ============================================================ */

const { useState, useEffect, useRef, useMemo } = React;

function SelectiveRepeatExp() {
  const { LogPanel, WindowVis, QuizPanel } = window;

  const [frames,     setFrames]     = useState(8);
  const [windowSize, setWindowSize] = useState(3);
  const [lossProb,   setLossProb]   = useState(0.25);
  const [speed,      setSpeed]      = useState(60);
  const [autoMode,   setAutoMode]   = useState(true);

  const [steps,   setSteps]   = useState([]);
  const [stepIdx, setStepIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const [logs,    setLogs]    = useState([]);

  const canvasRef = useRef(null);
  const accum     = useRef(0);

  const frameStates = useMemo(
    () => getSRFrameStates(steps, stepIdx, frames),
    [steps, stepIdx, frames]
  );

  const start = () => {
    const s = createSRSteps({ frames, windowSize, lossProb });
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
              : s.type === 'SEND' ? 'send' : 'info';
    setLogs(l => [...l, { t: s.t, msg: s.msg, cls }]);
  };

  useEffect(() => {
    if (canvasRef.current) drawSRCanvas(canvasRef.current, steps, stepIdx);
  }, [steps, stepIdx]);

  const reset = () => {
    setSteps([]); setStepIdx(-1); setLogs([]); setRunning(false);
    if (canvasRef.current) drawSRCanvas(canvasRef.current, [], -1);
  };

  return React.createElement('div', null,
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Experiment Overview'),
      React.createElement('div', { className: 'theory-block' },
        React.createElement('h3', { className: 'card-title' }, '🎯 Aim'),
        React.createElement('p', { className: 'theory-text' }, 'Implementation of Selective Repeat ARQ Flow Control Protocol.')
      ),
      React.createElement('div', { className: 'divider' }),
      React.createElement('div', { className: 'theory-block' },
        React.createElement('h3', { className: 'card-title' }, '📚 Theory'),
        React.createElement('p', { className: 'theory-text' }, 'Selective Repeat ARQ retransmits only the specific lost frame, allowing the receiver to buffer out-of-order data.')
      ),
      React.createElement('div', { className: 'divider' }),
      React.createElement('div', { className: 'theory-block' },
        React.createElement('h3', { className: 'card-title' }, '🛠 Procedure'),
        React.createElement('ol', { className: 'theory-text', style: { paddingLeft: '20px' } },
          React.createElement('li', null, 'Configure "Total Frames" and "Window Size".'),
          React.createElement('li', null, 'Set "Loss Probability".'),
          React.createElement('li', null, 'Monitor the timeline and receiver buffer.')
        )
      )
    ),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Parameters'),
      React.createElement('div', { className: 'controls-grid' },
        React.createElement('div', { className: 'ctrl' },
          React.createElement('label', null, 'Total Frames', React.createElement('span', null, frames)),
          React.createElement('input', { type: 'range', min: 4, max: 16, value: frames, onChange: e => setFrames(+e.target.value) })
        ),
        React.createElement('div', { className: 'ctrl' },
          React.createElement('label', null, 'Window Size (N)', React.createElement('span', null, windowSize)),
          React.createElement('input', { type: 'range', min: 2, max: 6, value: windowSize, onChange: e => setWindowSize(+e.target.value) })
        ),
        React.createElement('div', { className: 'ctrl' },
          React.createElement('label', null, 'Loss Probability', React.createElement('span', null, (lossProb * 100).toFixed(0) + '%')),
          React.createElement('input', { type: 'range', min: 0, max: 70, value: lossProb * 100, onChange: e => setLossProb(e.target.value / 100) })
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

    steps.length > 0 ? React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Frame Status Window'),
      React.createElement(WindowVis, { frameStates })
    ) : null,

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Timeline Visualization'),
      React.createElement('div', { className: 'viz-wrap' },
        React.createElement('canvas', { ref: canvasRef, width: 720, height: 480, style: { width: '100%', height: 'auto' } })
      )
    ),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Event Log'),
      React.createElement(LogPanel, { logs })
    ),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Self-Assessment Quiz'),
      React.createElement(QuizPanel, {
        questions: [
          {
            q: 'How does Selective Repeat differ from Go-Back-N when a frame is lost?',
            options: ['It drops the connection', 'It retransmits the entire window', 'It retransmits only the specific lost frame', 'It does nothing'],
            correct: 2,
            hint: 'Selective Repeat is "selective"—it only fixes what broke.'
          },
          {
            q: 'Does the receiver in Selective Repeat have a buffer?',
            options: ['No', 'Yes, to store out-of-order frames', 'Only for ACKs'],
            correct: 1,
            hint: 'The receiver must hold onto frames until the missing ones arrive.'
          },
          {
            q: 'In Selective Repeat, what type of Acknowledgement is used?',
            options: ['Cumulative ACK', 'Individual ACK', 'No ACK used', 'NACK only'],
            correct: 1,
            hint: 'Each frame is acknowledged independently to avoid retransmitting successful frames.'
          },
          {
            q: 'If the sequence numbers are 3 bits (0-7), what is the maximum window size allowed in SR?',
            options: ['8', '7', '4', '2'],
            correct: 2,
            hint: 'For SR, the window size must be at most half the sequence number space (2^(m-1)) to avoid overlap errors.'
          },
          {
            q: 'In SR, when does the sender window slide forward?',
            options: ['Whenever any frame is ACKed', 'Only when the oldest unacknowledged frame is ACKed', 'After every 5 seconds', 'It never slides'],
            correct: 1,
            hint: 'The window "base" only moves forward when the frame at the base is successfully acknowledged.'
          }
        ]
      })
    )
  );
}

window.SelectiveRepeatExp = SelectiveRepeatExp;
})();