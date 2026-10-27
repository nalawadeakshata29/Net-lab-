/* ============================================================
   components/shared.js
   Reusable React components and hooks.
   ============================================================ */

(function() {
  const { useEffect, useRef, useState } = React;

  // ── useAnimLoop ──
  function useAnimLoop(cb, running) {
    const raf = useRef(null);
    const cbRef = useRef(cb);
    cbRef.current = cb;

    useEffect(() => {
      if (!running) {
        if (raf.current) cancelAnimationFrame(raf.current);
        return;
      }
      let lastTs = null;
      const loop = (ts) => {
        if (lastTs === null) lastTs = ts;
        cbRef.current(ts - lastTs, ts);
        lastTs = ts;
        raf.current = requestAnimationFrame(loop);
      };
      raf.current = requestAnimationFrame(loop);
      return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    }, [running]);
  }

  // ── LogPanel ──
  function LogPanel({ logs }) {
    const scrollRef = useRef(null);
    useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [logs]);

    const empty = React.createElement('div', { className: 'log-line log-info' }, '⟩ Waiting for simulation...');
    const items = (logs || []).map((l, i) => 
      React.createElement('div', { key: i, className: 'log-line' },
        React.createElement('span', { className: 'log-time' }, `[${String(l.t).padStart(2, '0')}]`),
        React.createElement('span', { className: `log-${l.cls || 'info'}` }, l.msg)
      )
    );

    return React.createElement('div', { className: 'log-panel', ref: scrollRef }, (logs && logs.length) ? items : empty);
  }

  // ── StatsStrip ──
  function StatsStrip({ stats }) {
    if (!stats) return null;
    return React.createElement('div', { className: 'stats-strip' },
      stats.map((s, i) =>
        React.createElement('div', { key: i, className: 'stat-badge' },
          React.createElement('div', { className: `sv ${s.colorClass}` }, s.value),
          React.createElement('div', { className: 'sk' }, s.label)
        )
      )
    );
  }

  // ── WindowVis ──
  function WindowVis({ frameStates }) {
    if (!frameStates) return null;
    const legend = ['sent', 'acked', 'lost', 'retx', 'waiting'];
    return React.createElement('div', null,
      React.createElement('div', { className: 'window-vis' },
        frameStates.map((state, i) => React.createElement('div', { key: i, className: `win-box ${state}` }, `F${i}`))
      ),
      React.createElement('div', { style: { display: 'flex', gap: 12, marginTop: 10 } },
        legend.map(s => React.createElement('div', { key: s, style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)' } },
          React.createElement('div', { className: `win-box ${s}`, style: { width: 16, height: 16, fontSize: 9, borderRadius: 3 } }),
          s.toUpperCase()
        ))
      )
    );
  }

  // ── QuizPanel ──
  function QuizPanel({ questions }) {
    const [answers, setAnswers] = useState(new Array((questions || []).length).fill(null));
    const [submitted, setSubmitted] = useState(false);
    if (!questions) return null;

    const onSelect = (qIdx, optIdx) => { if (!submitted) { const a = [...answers]; a[qIdx] = optIdx; setAnswers(a); } };
    const score = answers.reduce((acc, curr, idx) => acc + (curr === questions[idx].correct ? 1 : 0), 0);

    return React.createElement('div', { className: 'quiz-container' },
      questions.map((q, i) => React.createElement('div', { key: i, className: 'quiz-q' },
        React.createElement('div', { className: 'quiz-q-text' }, `${i + 1}. ${q.q}`),
        React.createElement('div', { className: 'quiz-options' },
          q.options.map((opt, j) => {
            let cls = 'quiz-opt';
            if (answers[i] === j) cls += ' selected';
            if (submitted) { if (j === q.correct) cls += ' correct'; else if (answers[i] === j) cls += ' wrong'; }
            return React.createElement('div', { key: j, className: cls, onClick: () => onSelect(i, j) }, opt);
          })
        ),
        submitted && answers[i] !== q.correct && React.createElement('div', { className: 'quiz-hint' }, `💡 Hint: ${q.hint}`)
      )),
      !submitted ? React.createElement('button', { className: 'btn btn-primary', style: { marginTop: 20 }, disabled: answers.includes(null), onClick: () => setSubmitted(true) }, 'Check Answers')
      : React.createElement('div', { className: 'quiz-results' },
          React.createElement('div', { style: { fontWeight: 700, fontSize: '18px', color: 'var(--text)' } }, score === questions.length ? '🎉 Perfect!' : `📝 Score: ${score}/${questions.length}`),
          React.createElement('button', { className: 'btn btn-secondary', style: { marginTop: 12 }, onClick: () => { setAnswers(new Array(questions.length).fill(null)); setSubmitted(false); } }, 'Retry')
        )
    );
  }

  // Export
  window.useAnimLoop = useAnimLoop;
  window.LogPanel    = LogPanel;
  window.StatsStrip  = StatsStrip;
  window.WindowVis   = WindowVis;
  window.QuizPanel   = QuizPanel;
})();