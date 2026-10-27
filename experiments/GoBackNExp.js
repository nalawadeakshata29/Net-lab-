(function(){
/* ============================================================
   experiments/GoBackNExp.js
   ============================================================ */

const { useState, useEffect, useRef, useMemo } = React;

function GoBackNExp() {
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
    () => getGBNFrameStates(steps, stepIdx, frames),
    [steps, stepIdx, frames]
  );

  const start = () => {
    const s = createGBNSteps({ frames, windowSize, lossProb });
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
    if (canvasRef.current) drawGBNCanvas(canvasRef.current, steps, stepIdx);
  }, [steps, stepIdx]);

  const reset = () => {
    setSteps([]); setStepIdx(-1); setLogs([]); setRunning(false);
    if (canvasRef.current) drawGBNCanvas(canvasRef.current, [], -1);
  };

  return React.createElement('div', null,
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Experiment Overview'),
      React.createElement('div', { className: 'theory-block' },
        React.createElement('h3', { className: 'card-title' }, '🎯 Aim'),
        React.createElement('p', { className: 'theory-text' }, 'To simulate and analyze the performance of the sliding window Go-Back-N ARQ protocol.')
      ),
      React.createElement('div', { className: 'divider' }),
      React.createElement('div', { className: 'theory-block' },
        React.createElement('h3', { className: 'card-title' }, '📚 Theory'),
        React.createElement('p', { className: 'theory-text' }, 'Go-Back-N allows sending multiple frames before waiting for an ACK. If a frame is lost, the sender retransmits that frame and all subsequent ones.')
      ),
      React.createElement('div', { className: 'divider' }),
      React.createElement('div', { className: 'theory-block' },
        React.createElement('h3', { className: 'card-title' }, '🛠 Procedure'),
        React.createElement('ol', { className: 'theory-text', style: { paddingLeft: '20px' } },
          React.createElement('li', null, 'Adjust "Total Frames" and "Window Size".'),
          React.createElement('li', null, 'Set the "Loss Probability".'),
          React.createElement('li', null, 'Click "Start Simulation".')
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
            q: 'In Go-Back-N, if frame 3 is lost but frames 4 and 5 arrive successfully, what does the sender do?',
            options: ['Retransmit only frame 3', 'Retransmit frames 3, 4, and 5', 'Retransmit nothing', 'Wait for receiver to ask'],
            correct: 1,
            hint: 'Go-Back-N "goes back" to the lost frame and resends everything after it.'
          },
          {
            q: 'What is the receiver window size in Go-Back-N?',
            options: ['Same as sender window', 'Unlimited', 'Exactly 1', 'N - 1'],
            correct: 2,
            hint: 'The receiver in GBN only accepts the next expected frame in order; it does not buffer out-of-order frames.'
          },
          {
            q: 'What does "Cumulative Acknowledgement" mean in GBN?',
            options: ['ACK 5 means only frame 5 was received', 'ACK 5 means all frames up to 5 were received', 'Receiver sends multiple ACKs for one frame', 'The connection is encrypted'],
            correct: 1,
            hint: 'An ACK number refers to the last successfully received in-order frame, confirming all prior frames.'
          },
          {
            q: 'In GBN, if the sequence numbers are 3 bits (0-7), what is the maximum sender window size?',
            options: ['8', '7', '4', 'Unlimited'],
            correct: 1,
            hint: 'To avoid ambiguity between new and old frames, the window size must be at most 2^m - 1.'
          },
          {
            q: 'When is Go-Back-N more wasteful than Selective Repeat?',
            options: ['When the link is error-free', 'When the window size is 1', 'When there are frequent frame losses', 'It is never wasteful'],
            correct: 2,
            hint: 'GBN retransmits perfectly good frames that arrived out-of-order, which wastes bandwidth.'
          }
        ]
      })
    )
  );
}

window.GoBackNExp = GoBackNExp;
})();