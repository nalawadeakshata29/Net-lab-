# NetLab — Virtual Network Lab Simulator

## Project Structure

```
netlab/
├── index.html                  ← Entry point — loads everything
├── README.md                   ← This file
│
├── styles/
│   ├── base.css                ← CSS variables, reset, body, scrollbar
│   ├── layout.css              ← Header, sidebar, workspace, tabs
│   └── components.css          ← Cards, buttons, controls, badges, log panel
│
├── engines/
│   ├── stopAndWait.js          ← Stop-and-Wait ARQ simulation logic
│   ├── goBackN.js              ← Go-Back-N ARQ simulation logic
│   └── selectiveRepeat.js      ← Selective Repeat ARQ simulation logic
│
├── components/
│   ├── LogPanel.js             ← Reusable terminal-style log panel
│   ├── useAnimLoop.js          ← Custom animation loop hook (rAF)
│   └── StatsStrip.js           ← Stat badge row component
│
└── experiments/
    ├── StopWaitExp.js          ← Stop-and-Wait full experiment UI
    ├── GoBackNExp.js           ← Go-Back-N full experiment UI
    └── SelectiveRepeatExp.js   ← Selective Repeat full experiment UI
```

## How to Run

> No npm, no build step needed. Just open in browser.

```bash
# Option 1: Direct open
open index.html

# Option 2: Local server (recommended to avoid CORS on JS modules)
python3 -m http.server 8080
# Then open: http://localhost:8080
```

## How to Modify

| What you want to change        | File to edit                          |
|-------------------------------|---------------------------------------|
| Colors / fonts / dark theme   | `styles/base.css`                     |
| Header / sidebar / layout     | `styles/layout.css`                   |
| Buttons / cards / controls    | `styles/components.css`               |
| ARQ simulation logic (SAW)    | `engines/stopAndWait.js`              |
| ARQ simulation logic (GBN)    | `engines/goBackN.js`                  |
| ARQ simulation logic (SR)     | `engines/selectiveRepeat.js`          |
| Log panel appearance/behavior | `components/LogPanel.js`              |
| Animation speed/loop          | `components/useAnimLoop.js`           |
| Stats badges                  | `components/StatsStrip.js`            |
| Stop-and-Wait UI + canvas     | `experiments/StopWaitExp.js`          |
| Go-Back-N UI + canvas         | `experiments/GoBackNExp.js`           |
| Selective Repeat UI + canvas  | `experiments/SelectiveRepeatExp.js`   |

## Adding a New Experiment

1. Create `engines/yourProtocol.js` with pure simulation logic
2. Create `experiments/YourExp.js` importing your engine + shared components
3. In `index.html`, add a new `<script>` tag and register the experiment in the `tabs` array inside `App()`
