(function(){
/* ============================================================
   experiments/SlidingWindowAnalysisExp.js
   Comparison of GBN vs Selective Repeat
   ============================================================ */

const { useState, useEffect, useRef, useMemo } = React;

function SlidingWindowAnalysisExp() {
  const { LogPanel, StatsStrip, WindowVis } = window;

  const [frames,      setFrames]     = useState(10);
  const [windowSize,  setWindowSize] = useState(4);
  const [lossProb,    setLossProb]   = useState(0.2);
  const [protocol,    setProtocol]   = useState('GBN'); // 'GBN' or 'SR'
  const [speed,       setSpeed]      = useState(60);

  const [steps,    setSteps]    = useState([]);
  const [stepIdx,  setStepIdx]  = useState(-1);
  const [running,  setRunning]  = useState(false);
  const [logs,     setLogs]     = useState([]);

  const canvasRef = useRef(null);
  const accum     = useRef(0);

  const start = () => {
    const s = protocol === 'GBN' 
      ? createGBNSteps({ frames, windowSize, lossProb })
      : createSRSteps({ frames, windowSize, lossProb });
    setSteps(s); setStepIdx(-1); setLogs([]); setRunning(true);
    accum.current = 0;
  };

  useAnimLoop((dt) => {
    if (!running || !steps.length) return;
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
  }, running);

  const _pushLog = (s) => {
    const cls = s.type === 'ACK' ? 'ack' : s.type === 'LOSS' ? 'loss'
              : s.type === 'SEND' ? 'send' : 'info';
    setLogs(l => [...l, { t: s.t, msg: s.msg, cls }]);
  };

  const frameStates = useMemo(() => {
    return protocol === 'GBN' 
      ? getGBNFrameStates(steps, stepIdx, frames)
      : getSRFrameStates(steps, stepIdx, frames);
  }, [steps, stepIdx, frames, protocol]);

  useEffect(() => {
    if (canvasRef.current) {
      if (protocol === 'GBN') drawGBNCanvas(canvasRef.current, steps, stepIdx);
      else drawSRCanvas(canvasRef.current, steps, stepIdx);
    }
  }, [steps, stepIdx, protocol]);

  return React.createElement('div', null,
    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Sliding Window Analysis'),
      React.createElement('p', { className: 'theory-text' }, 'Compare how Go-Back-N and Selective Repeat handle multiple frames in flight and recover from packet loss.')
    ),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Protocol Configuration'),
      React.createElement('div', { className: 'controls-grid' },
        React.createElement('div', { className: 'ctrl' },
          React.createElement('label', null, 'Protocol Type'),
          React.createElement('select', { value: protocol, onChange: e => { setProtocol(e.target.value); setSteps([]); setStepIdx(-1); setLogs([]); } },
            React.createElement('option', { value: 'GBN' }, 'Go-Back-N'),
            React.createElement('option', { value: 'SR' }, 'Selective Repeat')
          )
        ),
        React.createElement('div', { className: 'ctrl' },
          React.createElement('label', null, 'Window Size', React.createElement('span', null, windowSize)),
          React.createElement('input', { type: 'range', min: 2, max: 6, value: windowSize, onChange: e => setWindowSize(+e.target.value) })
        ),
        React.createElement('div', { className: 'ctrl' },
          React.createElement('label', null, 'Loss Probability', React.createElement('span', null, (lossProb * 100).toFixed(0) + '%')),
          React.createElement('input', { type: 'range', min: 0, max: 60, value: lossProb * 100, onChange: e => setLossProb(e.target.value / 100) })
        )
      ),
      React.createElement('div', { className: 'btn-row', style: { marginTop: 14 } },
        React.createElement('button', { className: 'btn btn-primary', onClick: start }, '▶ Run Comparison'),
        React.createElement('button', { className: 'btn btn-danger', onClick: () => { setSteps([]); setStepIdx(-1); setLogs([]); setRunning(false); } }, '↺ Reset')
      )
    ),

    steps.length > 0 && React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Sender Window State'),
      React.createElement(WindowVis, { frameStates })
    ),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, `Visualizing ${protocol}`),
      React.createElement('canvas', { ref: canvasRef, width: 720, height: 400, style: { width: '100%', height: 'auto' } })
    ),

    React.createElement('div', { className: 'card' },
      React.createElement('div', { className: 'section-label' }, 'Protocol Insights'),
      React.createElement('div', { className: 'theory-block' },
        protocol === 'GBN' ? 
          React.createElement('p', { className: 'theory-text' }, 'In Go-Back-N, the receiver only accepts frames in order. If a frame is lost, all subsequent frames are discarded, forcing the sender to "go back" and retransmit the entire window.') :
          React.createElement('p', { className: 'theory-text' }, 'In Selective Repeat, the receiver has a buffer and can accept out-of-order frames. Only the specific frames that were lost are retransmitted, making it more efficient but more complex.')
      )
    ),

    React.createElement('div', { className: 'card', style: { marginTop: 16 } },
      React.createElement('div', { className: 'section-label' }, 'Event Log'),
      React.createElement(LogPanel, { logs })
    )
  );
}

window.SlidingWindowAnalysisExp = SlidingWindowAnalysisExp;
})();
