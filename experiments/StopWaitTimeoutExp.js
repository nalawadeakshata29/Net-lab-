(function(){
/* ============================================================
   experiments/StopWaitTimeoutExp.js
   Stop-and-Wait ARQ with explicit Timeout Mechanism
   ============================================================ */

const { useState, useEffect, useRef, useMemo } = React;

function StopWaitTimeoutExp() {
  const { LogPanel, StatsStrip, QuizPanel } = window;

  const [frames,    setFrames]    = useState(5);
  const [lossProb,  setLossProb]  = useState(0.4);
  const [timeout,   setTimeoutVal]= useState(3);
  const [speed,     setSpeed]     = useState(50);

  const [steps,    setSteps]    = useState([]);
  const [stepIdx,  setStepIdx]  = useState(-1);
  const [running,  setRunning]  = useState(false);
  const [logs,     setLogs]     = useState([]);
  const [timer,    setTimer]    = useState(0);

  const canvasRef = useRef(null);
  const accum     = useRef(0);

  const start = () => {
    // We use the standard SAW engine but we will focus on the timeout events
    const s = createSAWSteps({ frames, timeout, lossProb });
    setSteps(s); setStepIdx(-1); setLogs([]); setRunning(true);
    setTimer(0);
    accum.current = 0;
  };

  useAnimLoop((dt) => {
    if (!running || !steps.length) return;
    accum.current += dt;
    const msPerStep = 1500 - speed * 12;
    
    if (accum.current >= msPerStep) {
      accum.current = 0;
      setStepIdx(prev => {
        const next = prev + 1;
        if (next >= steps.length) { setRunning(false); setTimer(0); return prev; }
        
        const step = steps[next];
        _pushLog(step);

        if (step.type === 'SEND') {
          setTimer(timeout);
        } else if (step.type === 'ACK') {
          setTimer(0);
        } else if (step.type === 'TIMEOUT') {
          setTimer(timeout);
        }

        return next;
      });
    } else {
      // Simple timer countdown visualization logic
      if (stepIdx >= 0 && steps[stepIdx].type === 'SEND' && timer > 0) {
        // Decrease timer slowly based on dt
        // This is purely visual
      }
    }
  }, running);

  const _pushLog = (s) => {
    let msg = s.msg;
    if (s.type === 'SEND') msg = `[TIMER START] ` + msg;
    if (s.type === 'TIMEOUT') msg = `[TIMER EXPIRED] ` + msg;
    const cls = s.type === 'ACK' ? 'ack' : s.type === 'LOSS' ? 'loss'
              : s.type === 'TIMEOUT' ? 'timeout' : s.type === 'SEND' ? 'send' : 'info';
    setLogs(l => [...l, { t: s.t, msg, cls }]);
  };

  useEffect(() => {
    if (canvasRef.current) drawSAWCanvas(canvasRef.current, steps, stepIdx);
  }, [steps, stepIdx]);

  return React.createElement('div', null,
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Timeout Mechanism Analysis'),
      React.createElement('div', { className: 'theory-block' },
        React.createElement('h3', { className: 'card-title' }, '🎯 Aim'),
        React.createElement('p', { className: 'theory-text' }, 'To study the role of timers in ARQ protocols for recovering from lost frames or ACKs.')
      )
    ),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Parameters'),
      React.createElement('div', { className: 'controls-grid' },
        React.createElement('div', { className: 'ctrl' },
          React.createElement('label', null, 'Frames', React.createElement('span', null, frames)),
          React.createElement('input', { type: 'range', min: 2, max: 10, value: frames, onChange: e => setFrames(+e.target.value) })
        ),
        React.createElement('div', { className: 'ctrl' },
          React.createElement('label', null, 'Loss Prob.', React.createElement('span', null, (lossProb * 100).toFixed(0) + '%')),
          React.createElement('input', { type: 'range', min: 0, max: 80, value: lossProb * 100, onChange: e => setLossProb(e.target.value / 100) })
        ),
        React.createElement('div', { className: 'ctrl' },
          React.createElement('label', null, 'Timeout (s)', React.createElement('span', null, timeout)),
          React.createElement('input', { type: 'range', min: 1, max: 5, value: timeout, onChange: e => setTimeoutVal(+e.target.value) })
        )
      ),
      React.createElement('div', { className: 'btn-row', style: { marginTop: 14 } },
        React.createElement('button', { className: 'btn btn-primary', onClick: start }, '▶ Start Simulation'),
        React.createElement('button', { className: 'btn btn-danger', onClick: () => { setSteps([]); setStepIdx(-1); setLogs([]); setRunning(false); } }, '↺ Reset')
      )
    ),

    running && timer > 0 && React.createElement('div', { className: 'card', style: { textAlign: 'center', border: '2px solid var(--yellow)' } },
       React.createElement('div', { style: { fontSize: '12px', fontWeight: 600, color: 'var(--text3)' } }, 'SENDER TIMER'),
       React.createElement('div', { style: { fontSize: '24px', fontWeight: 700, color: 'var(--yellow)' } }, `⌛ Waiting for ACK...`)
    ),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Timeline Visualization'),
      React.createElement('canvas', { ref: canvasRef, width: 720, height: 400, style: { width: '100%', height: 'auto' } })
    ),

    React.createElement('div', { className: 'card', style: { marginTop: 16 } },
      React.createElement('div', { className: 'section-label' }, 'Event Log'),
      React.createElement(LogPanel, { logs })
    ),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Quiz'),
      React.createElement(QuizPanel, {
        questions: [
          {
            q: 'If the timeout interval is too short, what happens?',
            options: ['Network becomes faster', 'Unnecessary retransmissions occur', 'No frames are sent', 'Efficiency increases'],
            correct: 1,
            hint: 'A short timer might expire before a valid ACK has time to return.'
          },
          {
            q: 'What triggers the timer to start in Stop-and-Wait?',
            options: ['Receiving an ACK', 'Sending a frame', 'Connection loss', 'Manual trigger'],
            correct: 1,
            hint: 'The sender starts the clock as soon as the frame is sent.'
          }
        ]
      })
    )
  );
}

window.StopWaitTimeoutExp = StopWaitTimeoutExp;
})();
