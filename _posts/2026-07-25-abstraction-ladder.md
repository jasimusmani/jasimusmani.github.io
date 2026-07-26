---
layout: post
title: "The Abstraction Ladder — From Sand to Claude Code"
date: 2026-07-25 09:00:00
description: "Every layer humans have stacked between a grain of sand and an English sentence — silicon, transistors, gates, binary arithmetic, memory, machine code, assembly, compilers, neural networks and LLMs — with a gate-level adder, a steppable CPU and a scrubable 1703-to-now timeline you can operate in the page."
tags: computing history hardware abstraction llm
categories: ai
thumbnail: assets/img/abstraction_thumb.png
og_image: assets/img/abstraction_thumb.png
featured: true
toc:
  sidebar: left
_styles: |
  /* The Abstraction Ladder — post-scoped styles.
     Every panel is theme-aware. The --al-c-* tokens are read at runtime by
     abstraction-ladder.js so the canvases repaint with the page, and --al-glow
     turns the phosphor bloom off in light mode where it would only smear. */

  .al {
    /* light: an instrument printed on graph paper */
    --al-bg: #f6f9f7;
    --al-bg2: #ffffff;
    --al-line: rgba(8, 107, 48, 0.2);
    --al-shadow: 0 2px 18px rgba(13, 36, 25, 0.09);
    --al-scan: 0;
    --al-glow: 0;

    --al-c-on: #086b30;
    --al-c-off: #b3c9bc;
    --al-c-amber: #8f5407;
    --al-c-cyan: #0a6580;
    --al-c-magenta: #8c1177;
    --al-c-red: #ad2118;
    --al-c-text: #44604f;
    --al-c-bright: #0d2419;
    --al-c-grid: rgba(8, 107, 48, 0.075);
    --al-c-fillOn: rgba(8, 107, 48, 0.15);
    --al-c-fillOff: rgba(8, 107, 48, 0.035);
    --al-c-stroke: #8ba597;
    --al-c-plot: rgba(8, 107, 48, 0.045);

    --al-tk-kw: #7b2d90;
    --al-tk-fn: #0a6580;
    --al-tk-num: #8f5407;
    --al-tk-com: #6b8578;
    --al-tk-str: #086b30;
    --al-tk-var: #ad2118;

    --al-cat-theory: #0a6580;
    --al-cat-device: #8f5407;
    --al-cat-machine: #8c1177;
    --al-cat-language: #086b30;
    --al-cat-network: #2a4bb8;
    --al-cat-learning: #ad2118;

    --al-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  }

  html[data-theme="dark"] .al {
    /* dark: the oscilloscope */
    --al-bg: #080d0f;
    --al-bg2: #0c1315;
    --al-line: rgba(57, 255, 122, 0.16);
    --al-shadow:
      0 6px 40px rgba(0, 0, 0, 0.45),
      inset 0 0 90px rgba(57, 255, 122, 0.03);
    --al-scan: 1;
    --al-glow: 1;

    --al-c-on: #39ff7a;
    --al-c-off: #1f3a2c;
    --al-c-amber: #ffb347;
    --al-c-cyan: #58e1ff;
    --al-c-magenta: #ff7ad9;
    --al-c-red: #ff6b62;
    --al-c-text: #9fbaab;
    --al-c-bright: #d9ffe9;
    --al-c-grid: rgba(57, 255, 122, 0.07);
    --al-c-fillOn: rgba(57, 255, 122, 0.12);
    --al-c-fillOff: rgba(57, 255, 122, 0.03);
    --al-c-stroke: #35594a;
    --al-c-plot: rgba(57, 255, 122, 0.05);

    --al-tk-kw: #ff9ee0;
    --al-tk-fn: #7fe8ff;
    --al-tk-num: #ffc978;
    --al-tk-com: #6f9083;
    --al-tk-str: #7dffab;
    --al-tk-var: #ff9d93;

    --al-cat-theory: #58e1ff;
    --al-cat-device: #ffb347;
    --al-cat-machine: #ff7ad9;
    --al-cat-language: #39ff7a;
    --al-cat-network: #8fa8ff;
    --al-cat-learning: #ff8b82;
  }

  /* Panels break out of the 930px column only when there is room to spare. */
  .al-bleed {
    width: 100%;
  }
  @media (min-width: 1400px) {
    .al-bleed {
      width: calc(100% + 200px);
      margin-right: -200px;
    }
  }
  @media (min-width: 1700px) {
    .al-bleed {
      width: calc(100% + 330px);
      margin-right: -330px;
    }
  }

  .al {
    display: block;
    margin: 2.2rem 0;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--al-line);
    background: var(--al-bg);
    box-shadow: var(--al-shadow);
    color: var(--al-c-text);
    font-family: var(--al-mono);
    font-size: 0.86rem;
    line-height: 1.5;
    position: relative;
  }
  html[data-theme="dark"] .al::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: 12px;
    background: repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.022) 0 1px, transparent 1px 3px);
  }

  .al-head {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 0.9rem;
    background: var(--al-c-fillOff);
    border-bottom: 1px solid var(--al-line);
    font-size: 0.74rem;
    letter-spacing: 0.06em;
  }
  .al-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    display: inline-block;
    flex: 0 0 auto;
  }
  .al-dot-r {
    background: #e0554c;
  }
  .al-dot-y {
    background: #e0a52e;
  }
  .al-dot-g {
    background: #27a544;
  }
  .al-title {
    margin-left: 0.5rem;
    color: var(--al-c-bright);
    font-weight: 600;
  }
  .al-badge {
    margin-left: auto;
    background: var(--al-c-fillOn);
    border: 1px solid var(--al-c-on);
    color: var(--al-c-on);
    padding: 0.08rem 0.55rem;
    border-radius: 999px;
    font-size: 0.66rem;
    white-space: nowrap;
  }
  .al-body {
    padding: 0.9rem;
  }
  .al-hr {
    border: 0;
    border-top: 1px dashed var(--al-line);
    margin: 1.2rem 0 0.8rem;
  }

  /* --- bit switches --- */
  .al-inputs {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .al-bitrow {
    display: flex;
    align-items: center;
    gap: 0.28rem;
    flex-wrap: wrap;
  }
  .al-bitlabel {
    min-width: 1.9rem;
    color: var(--al-c-text);
    font-size: 0.8rem;
    flex: 0 0 auto;
  }
  .al-bit {
    width: 2rem;
    height: 2rem;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    border: 1px solid var(--al-line);
    background: var(--al-c-fillOff);
    color: var(--al-c-text);
    font-family: var(--al-mono);
    font-size: 0.95rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    transition:
      background 0.12s ease,
      color 0.12s ease,
      box-shadow 0.12s ease;
  }
  .al-bit:hover:not(:disabled) {
    border-color: var(--al-c-on);
  }
  .al-bit:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .al-bit.is-on {
    background: var(--al-c-fillOn);
    color: var(--al-c-on);
    border-color: var(--al-c-on);
  }
  html[data-theme="dark"] .al-bit.is-on {
    box-shadow: 0 0 12px rgba(57, 255, 122, 0.4);
  }
  .al-bit-c.is-on {
    color: var(--al-c-amber);
    border-color: var(--al-c-amber);
  }
  .al-bit-ro {
    cursor: default;
    border-style: dashed;
  }
  .al-bitread {
    margin-left: 0.6rem;
    color: var(--al-c-bright);
    font-size: 0.85rem;
  }
  .al-cinrow {
    margin-top: 0.15rem;
  }

  /* --- canvases --- */
  .al-canvas-wrap {
    margin: 0.8rem 0;
    border: 1px solid var(--al-line);
    border-radius: 8px;
    background: var(--al-bg2);
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }
  .al-canvas-wrap:focus-visible {
    outline: 2px solid var(--al-c-on);
    outline-offset: 2px;
  }
  .al-canvas {
    display: block;
    width: 100%;
    min-width: 560px;
  }

  /* --- controls --- */
  .al-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem 0.7rem;
    margin: 0.6rem 0;
  }
  .al-btn {
    font-family: var(--al-mono);
    font-size: 0.78rem;
    padding: 0.38rem 0.8rem;
    border-radius: 6px;
    border: 1px solid var(--al-line);
    background: var(--al-c-fillOff);
    color: var(--al-c-bright);
    cursor: pointer;
    transition: background 0.12s ease;
  }
  .al-btn:hover {
    background: var(--al-c-fillOn);
    border-color: var(--al-c-on);
  }
  .al-btn-go {
    border-color: var(--al-c-on);
    color: var(--al-c-on);
  }
  .al-ctl {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.76rem;
    margin: 0;
    color: var(--al-c-text);
  }
  .al-ctl.al-grow {
    flex: 1 1 220px;
  }
  .al-range {
    accent-color: var(--al-c-on);
    width: 8rem;
    max-width: 100%;
    flex: 1 1 auto;
  }
  .al-range-wide {
    width: 100%;
    display: block;
    margin: 0.4rem 0;
  }
  .al-check {
    accent-color: var(--al-c-on);
  }

  /* --- stat readouts --- */
  .al-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
    gap: 0.5rem;
    margin: 0.7rem 0;
  }
  .al-stat {
    border: 1px solid var(--al-line);
    border-radius: 7px;
    padding: 0.4rem 0.6rem;
    background: var(--al-c-fillOff);
    min-width: 0;
  }
  .al-stat-k {
    display: block;
    font-size: 0.62rem;
    letter-spacing: 0.09em;
    color: var(--al-c-text);
    opacity: 0.85;
    text-transform: uppercase;
  }
  .al-stat-v {
    display: block;
    color: var(--al-c-bright);
    font-size: 0.85rem;
    overflow-wrap: anywhere;
  }
  .al-stat-v.al-big {
    font-size: 1.35rem;
    line-height: 1.25;
    color: var(--al-c-on);
  }
  .al-stat-v.is-on {
    color: var(--al-c-on);
  }
  .al-stat.is-alert {
    border-color: var(--al-c-amber);
    background: var(--al-c-fillOn);
  }
  .al-stat.is-alert .al-stat-v {
    color: var(--al-c-amber);
  }

  /* --- tables --- */
  .al-tt {
    width: 100%;
    border-collapse: collapse;
    margin: 0.6rem 0 0;
    font-size: 0.78rem;
    color: var(--al-c-text);
  }
  .al-tt-cap {
    caption-side: top;
    text-align: left;
    font-size: 0.68rem;
    color: var(--al-c-text);
    padding-bottom: 0.35rem;
  }
  .al-tt th,
  .al-tt td {
    border: 1px solid var(--al-line);
    padding: 0.22rem 0.5rem;
    text-align: center;
  }
  .al-tt th {
    color: var(--al-c-bright);
    background: var(--al-c-fillOff);
    font-weight: 500;
  }
  .al-tt tr.is-active td {
    background: var(--al-c-fillOn);
    color: var(--al-c-on);
  }

  /* --- text --- */
  .al-live,
  .al-note,
  .al-cap,
  .al-below {
    margin: 0.55rem 0 0;
    font-size: 0.76rem;
    color: var(--al-c-text);
    line-height: 1.55;
  }
  .al-live {
    color: var(--al-c-bright);
    border-left: 2px solid var(--al-c-on);
    padding-left: 0.6rem;
  }
  .al-note.is-err {
    color: var(--al-c-red);
  }
  .al-note.is-ok {
    color: var(--al-c-on);
  }
  .al-below-k {
    color: var(--al-c-on);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-size: 0.62rem;
  }
  .al-phase {
    margin: 0 0 0.6rem;
    font-size: 0.8rem;
    color: var(--al-c-cyan);
    letter-spacing: 0.04em;
  }
  .al-phase.is-halt {
    color: var(--al-c-red);
  }

  /* --- tabs --- */
  .al-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.6rem;
  }
  .al-tab {
    font-family: var(--al-mono);
    font-size: 0.74rem;
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    border: 1px solid var(--al-line);
    background: transparent;
    color: var(--al-c-text);
    cursor: pointer;
  }
  .al-tab:hover {
    border-color: var(--al-c-on);
  }
  .al-tab.is-on {
    background: var(--al-c-fillOn);
    color: var(--al-c-on);
    border-color: var(--al-c-on);
  }

  /* --- fab progress --- */
  .al-progress {
    height: 3px;
    background: var(--al-c-fillOff);
    border-radius: 999px;
    overflow: hidden;
  }
  .al-progress-fill {
    height: 100%;
    width: 0;
    background: var(--al-c-on);
  }

  /* --- CPU --- */
  .al-src {
    width: 100%;
    font-family: var(--al-mono);
    font-size: 0.78rem;
    line-height: 1.55;
    padding: 0.7rem 0.8rem;
    border-radius: 8px;
    border: 1px solid var(--al-line);
    background: var(--al-bg2);
    color: var(--al-c-bright);
    resize: vertical;
    min-height: 8rem;
    tab-size: 4;
  }
  .al-src:focus-visible {
    outline: 2px solid var(--al-c-on);
    outline-offset: 1px;
  }
  .al-ram {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 0.3rem;
    margin: 0.5rem 0;
  }
  .al-ram-c {
    border: 1px solid var(--al-line);
    border-radius: 5px;
    padding: 0.28rem 0.1rem;
    text-align: center;
    background: var(--al-c-fillOff);
    min-width: 0;
  }
  .al-ram-a {
    display: block;
    font-size: 0.58rem;
    color: var(--al-c-text);
    opacity: 0.7;
  }
  .al-ram-v {
    display: block;
    font-size: 0.9rem;
    color: var(--al-c-bright);
  }
  .al-ram-l {
    display: block;
    font-size: 0.52rem;
    color: var(--al-c-cyan);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-height: 0.8em;
  }
  .al-ram-c.is-mar {
    border-color: var(--al-c-amber);
    background: var(--al-c-fillOn);
  }
  .al-ram-c.is-pc {
    border-color: var(--al-c-cyan);
    outline: 1px solid var(--al-c-cyan);
  }
  .al-dis {
    margin-top: 0.6rem;
    display: grid;
    gap: 0.25rem;
  }
  .al-dis-row {
    display: flex;
    gap: 0.7rem;
    align-items: baseline;
  }
  .al-dis-k {
    width: 5rem;
    flex: 0 0 auto;
    font-size: 0.64rem;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--al-c-text);
    opacity: 0.8;
  }
  .al-dis-v {
    background: none;
    color: var(--al-c-bright);
    font-size: 0.85rem;
    padding: 0;
  }
  .al-dis-v.is-asm {
    color: var(--al-c-on);
  }
  .al-out {
    margin: 0.3rem 0 0;
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--al-line);
    border-radius: 6px;
    background: var(--al-bg2);
    color: var(--al-c-on);
    font-family: var(--al-mono);
    font-size: 0.8rem;
    max-height: 7rem;
    overflow: auto;
  }

  /* --- ladder --- */
  .al-rungs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-bottom: 0.7rem;
  }
  .al-rung {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.05rem;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    border: 1px solid var(--al-line);
    background: transparent;
    cursor: pointer;
    font-family: var(--al-mono);
    text-align: left;
  }
  .al-rung:hover {
    border-color: var(--al-c-on);
  }
  .al-rung-y {
    font-size: 0.6rem;
    color: var(--al-c-text);
    opacity: 0.8;
  }
  .al-rung-n {
    font-size: 0.76rem;
    color: var(--al-c-text);
  }
  .al-rung.is-on {
    border-color: var(--al-c-on);
    background: var(--al-c-fillOn);
  }
  .al-rung.is-on .al-rung-n {
    color: var(--al-c-on);
  }
  .al-code {
    background: var(--al-bg2);
    border: 1px solid var(--al-line);
    border-radius: 8px;
    padding: 0.8rem 0.9rem;
    margin: 0;
    overflow-x: auto;
    font-family: var(--al-mono);
    font-size: 0.78rem;
    line-height: 1.6;
    color: var(--al-c-bright);
    white-space: pre;
    min-height: 9.5rem;
  }
  .al-code:focus-visible {
    outline: 2px solid var(--al-c-on);
    outline-offset: 1px;
  }
  .al-tk-kw {
    color: var(--al-tk-kw);
  }
  .al-tk-fn {
    color: var(--al-tk-fn);
  }
  .al-tk-num {
    color: var(--al-tk-num);
  }
  .al-tk-com {
    color: var(--al-tk-com);
    font-style: italic;
  }
  .al-tk-str {
    color: var(--al-tk-str);
  }
  .al-tk-var {
    color: var(--al-tk-var);
  }

  /* --- timeline --- */
  .al-tl-wrap {
    position: relative;
    height: 82px;
    margin: 0.4rem 0 0.2rem;
  }
  .al-eras {
    position: absolute;
    left: 8px;
    right: 8px;
    top: 0;
    height: 22px;
  }
  .al-era {
    position: absolute;
    top: 0;
    height: 22px;
    border-left: 1px solid var(--al-line);
    background: var(--al-c-fillOff);
    overflow: hidden;
  }
  .al-era-t {
    display: block;
    font-size: 0.58rem;
    padding: 0.25rem 0 0 4px;
    color: var(--al-c-text);
    white-space: nowrap;
  }
  .al-tl-track {
    position: absolute;
    left: 8px;
    right: 8px;
    top: 46px;
    height: 2px;
    background: var(--al-line);
  }
  .al-tl-dot {
    position: absolute;
    top: 50%;
    width: 9px;
    height: 9px;
    margin: -4.5px 0 0 -4.5px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid currentColor;
    background: var(--al-bg);
    color: var(--al-c-stroke);
    cursor: pointer;
  }
  .al-tl-dot.is-past {
    background: currentColor;
    opacity: 0.55;
  }
  .al-tl-dot.is-on {
    background: currentColor;
    transform: scale(1.6);
    opacity: 1;
  }
  html[data-theme="dark"] .al-tl-dot.is-on {
    box-shadow: 0 0 10px currentColor;
  }
  .al-ticks {
    position: absolute;
    left: 8px;
    right: 8px;
    top: 58px;
    height: 16px;
  }
  .al-tick {
    position: absolute;
    transform: translateX(-50%);
    font-size: 0.58rem;
    color: var(--al-c-text);
    opacity: 0.8;
  }
  .al-tl-card {
    border: 1px solid var(--al-line);
    border-radius: 8px;
    padding: 0.7rem 0.9rem;
    background: var(--al-c-fillOff);
    margin-top: 0.4rem;
  }
  .al-tl-year {
    font-size: 1.6rem;
    color: var(--al-c-on);
    line-height: 1.1;
  }
  .al-tl-who {
    font-size: 0.9rem;
    color: var(--al-c-bright);
    margin-bottom: 0.3rem;
  }
  .al-tl-what {
    margin: 0;
    font-size: 0.82rem;
    color: var(--al-c-text);
  }
  .al-tl-meta {
    margin-top: 0.5rem;
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }
  .al-pill {
    font-size: 0.62rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    border: 1px solid currentColor;
    color: var(--al-c-text);
  }

  .al-cat-theory {
    color: var(--al-cat-theory);
  }
  .al-cat-device {
    color: var(--al-cat-device);
  }
  .al-cat-machine {
    color: var(--al-cat-machine);
  }
  .al-cat-language {
    color: var(--al-cat-language);
  }
  .al-cat-network {
    color: var(--al-cat-network);
  }
  .al-cat-learning {
    color: var(--al-cat-learning);
  }
  .al-tab.al-cat-theory.is-on {
    color: var(--al-cat-theory);
  }
  .al-tab.al-cat-device.is-on {
    color: var(--al-cat-device);
  }
  .al-tab.al-cat-machine.is-on {
    color: var(--al-cat-machine);
  }
  .al-tab.al-cat-language.is-on {
    color: var(--al-cat-language);
  }
  .al-tab.al-cat-network.is-on {
    color: var(--al-cat-network);
  }
  .al-tab.al-cat-learning.is-on {
    color: var(--al-cat-learning);
  }
  .al-tab.al-cat-theory.is-on,
  .al-tab.al-cat-device.is-on,
  .al-tab.al-cat-machine.is-on,
  .al-tab.al-cat-language.is-on,
  .al-tab.al-cat-network.is-on,
  .al-tab.al-cat-learning.is-on {
    background: var(--al-c-fillOff);
    border-color: currentColor;
  }
  .al-tab.al-cat-theory:not(.is-on),
  .al-tab.al-cat-device:not(.is-on),
  .al-tab.al-cat-machine:not(.is-on),
  .al-tab.al-cat-language:not(.is-on),
  .al-tab.al-cat-network:not(.is-on),
  .al-tab.al-cat-learning:not(.is-on) {
    color: var(--al-c-text);
    opacity: 0.6;
  }

  /* --- prose helpers, these follow the site theme directly --- */
  .al-hist {
    border-left: 3px solid var(--global-theme-color);
    background: var(--global-code-bg-color);
    border-radius: 0 8px 8px 0;
    padding: 0.75rem 1rem;
    margin: 1.4rem 0;
    font-size: 0.92rem;
  }
  .al-hist h4 {
    margin: 0 0 0.3rem;
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--global-theme-color);
  }
  .al-hist p:last-child {
    margin-bottom: 0;
  }
  .al-layer {
    display: inline-block;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    padding: 0.12rem 0.6rem;
    border-radius: 999px;
    border: 1px solid var(--global-theme-color);
    color: var(--global-theme-color);
    margin-bottom: 0.4rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .al * {
      transition: none !important;
    }
    .al::after {
      display: none;
    }
  }

  @media (max-width: 600px) {
    .al-body {
      padding: 0.7rem;
    }
    .al-bit {
      width: 1.7rem;
      height: 1.7rem;
      font-size: 0.85rem;
    }
    .al-bitlabel {
      min-width: 1.4rem;
    }
    .al-ram {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .al-dis-k {
      width: 4rem;
    }
    .al-era-t {
      font-size: 0.5rem;
    }
  }
---

> Right now, somewhere under your fingertips, roughly a hundred billion switches made of doped sand are flipping on and off to render this sentence. You did not think about a single one of them. That gap — between the sentence you read and the switches that drew it — is the largest engineering artefact humans have ever built. It has thirteen or so floors, it took about a hundred and seventy years, and almost nobody has seen the whole thing at once.
>
> This post is a walk from the bottom floor to the top. Every rung has something you can operate.

A word on how to read it. Each section is a **layer**: a place where somebody decided that the thing below was too complicated to keep thinking about, drew a box around it, gave the box a name, and started building on top of the name instead of the thing. That is all an abstraction is. A box, a name, and a promise about what happens at the edges.

The promise is what makes it work. The promise is also what eventually breaks.

---

## 0 · Sand — the layer that is not an abstraction at all

<span class="al-layer">LAYER 00 · PHYSICAL</span>

Start below the bottom, at the one layer that is not a human invention: rock.

Silicon is the second most abundant element in the Earth's crust, about 28% by mass, and essentially all of it is locked up as silica — SiO₂, which is to say quartz, which is to say sand. It is worth roughly nothing. The refined product of the process below sells for something like a hundred million dollars per tonne of finished die, which makes it, by a wide margin, the most extreme value-add in the history of manufacturing.

The path from one to the other has six steps. Step through them below, or let it play; each stage carries the numbers that actually matter.

<div class="al al-bleed" data-al-module="fab"></div>

Walk through the stages above and notice what each one is buying:

**Purification.** Carbothermic reduction in an arc furnace gets you metallurgical-grade silicon at about 98% purity — good enough for aluminium alloys, useless for electronics. The Siemens process then decomposes trichlorosilane onto a hot rod to reach **eleven nines**: 99.999999999% pure. That is one foreign atom per hundred billion silicon atoms. This is not fussiness. A semiconductor's entire behaviour comes from impurities you put in _deliberately_, at concentrations around one part in a million. If the accidental impurities are anywhere near that level, you are not designing a transistor, you are rolling dice.

**Crystallisation.** The Czochralski process — a seed crystal dipped into molten silicon and slowly withdrawn while rotating — produces a single continuous crystal, 300 mm across and two metres long, in which every atom sits where the lattice says it should. Not "mostly". Every atom. A grain boundary in the wrong place is a short circuit.

**Lithography.** Then the part that beggars belief. A droplet of molten tin, tens of micrometres across, is hit twice by a CO₂ laser — once to flatten it into a pancake, once to blast it into a plasma — and the plasma emits extreme ultraviolet light at 13.5 nm. That light cannot travel through air, or glass, so the whole optical path is a vacuum full of mirrors polished to sub-nanometre flatness. It prints features smaller than its own wavelength using interference tricks. Fifty thousand times a second, tin droplets, in a machine that costs more than an airliner.

**Doping.** Finally, ion implantation fires boron and phosphorus into precise regions of the crystal, and the pure material you worked so hard for gets deliberately contaminated in patterns. Those patterns are the transistors.

<div class="al-hist" markdown="1">
#### The floor beneath the floor

Nothing above is an abstraction. Every step is a physical process with a yield, a cost and a failure mode. This is the only layer in this entire post where the answer to "but what is it _really_ doing?" is: it is being a rock, extremely carefully.

Everything from here up is a story we tell about voltage.
</div>

---

## 1 · The switch — how a rock learned to decide

<span class="al-layer">LAYER 01 · DEVICE</span>

Pure silicon is a poor conductor. Each atom shares its four outer electrons with four neighbours, every bond is satisfied, and there is almost nothing free to carry current. The energy needed to knock an electron loose — the **band gap** — is about 1.12 eV, which at room temperature is a big enough hill that very few electrons make it over.

Doping changes the arithmetic. Add phosphorus, which has five outer electrons: four go into bonds, one is left over and roams. That is **n-type**. Add boron, which has three: one bond is left unsatisfied, and the resulting "hole" moves through the lattice as though it were a positive particle. That is **p-type**.

Put them together and something asymmetric happens. Free electrons on the n side wander across the junction and fill holes on the p side, leaving behind a region with no mobile charge at all — the **depletion region** — and a built-in electric field pointing in one direction only. Current now flows one way and not the other. That is a diode, and it is the first time a piece of rock does something that could reasonably be called a decision.

The MOSFET is the trick that makes the decision _controllable_. Two n-type regions — source and drain — sit in a p-type substrate, separated by a gap that current cannot normally cross. Above the gap sits a metal gate, insulated from the silicon by a layer of oxide a few atoms thick. The gate touches nothing. It only makes a field.

Raise the gate voltage past the threshold $$V_{th}$$ and the field pushes holes away and pulls electrons in, until a thin sliver of the p-type substrate _inverts_ and becomes locally n-type. A channel appears. Current flows. Drop the voltage and the channel evaporates.

$$
I_D \;\propto\; \left(V_{gs} - V_{th}\right)^2 \qquad \text{for } V_{gs} > V_{th}, \qquad I_D \approx 0 \text{ otherwise}
$$

Drag the gate voltage below and watch the channel form. The plot beside it is the real characteristic: a family of curves, one per gate voltage, with the dashed parabola marking where the device stops behaving like a resistor and starts behaving like a current source.

<div class="al al-bleed" data-al-module="mosfet"></div>

Two things deserve to be stared at.

First: **the gate is not connected to anything.** It controls a current it never touches, through an insulator, purely with a field. That is why the input of a MOSFET costs almost no power to hold — which is why you can chain billions of them together without the whole thing melting.

Second: **that squared term is a curve, and we are about to pretend it is a cliff.** The transistor is an analogue device with a continuous response. The entire digital world is built on the decision to use only the two ends of that curve and treat everything in between as a transient error to be raced through as fast as possible.

Switch the panel to **Inverter** and you can watch that decision being manufactured. Two transistors — one n-type pulling down, one p-type pulling up — are wired between the supply and ground with their gates tied together. The voltage transfer characteristic that appears is not a straight line. Through the middle band it is nearly vertical, which is to say the gain is far greater than one, which is to say **a small error on the input comes out smaller than it went in**. That is the whole trick. Noise gets squashed rather than accumulated, and because it gets squashed at every single gate, you can chain a billion of them and still have a 1 that means 1 at the far end.

Every abstraction above this one is standing on that cliff.

<div class="al-hist" markdown="1">
#### 1947 · Murray Hill, New Jersey

On 23 December 1947, John Bardeen and Walter Brattain demonstrated a point-contact transistor: two gold contacts pressed onto a germanium crystal, amplifying a signal. William Shockley, irritated at having been left off the work, went away and derived the junction transistor over the following weeks — a cleaner, manufacturable device. All three shared the 1956 Nobel Prize.

Eleven years later, Jack Kilby at Texas Instruments built several components on a single slab of germanium; the following year Robert Noyce at Fairchild, building on Jean Hoerni's planar process, made the same idea manufacturable in silicon with interconnects printed on top. The integrated circuit stopped being a demonstration and became an industry.
</div>

---

## 2 · Gates — one operation is enough for all of them

<span class="al-layer">LAYER 02 · LOGIC</span>

Here is the first real abstraction, and it is a big one. We stop talking about volts.

Wire two transistors so that a high input pulls the output to ground and a low input pulls it to the supply, and you have an inverter: two transistors, one **NOT**. Wire four in the CMOS arrangement — two in series pulling down, two in parallel pulling up — and you have a **NAND**. From that moment on, nobody designing on top of this needs to know about depletion regions, threshold voltages or mobility. They need to know one thing:

$$
\text{NAND}(A, B) = \overline{A \cdot B}
$$

And that turns out to be enough. NAND is **functionally complete**: every Boolean function that exists can be built from NAND gates alone. Not "most". Every one. The proof is constructive and short, and you can run it below — pick a target gate and watch it get rebuilt out of nothing but NANDs.

<div class="al al-bleed" data-al-module="nand"></div>

Two things in that panel are worth doing. Press **Propagate** and watch the signal arrive one level at a time — the output is not merely late, it is actively _wrong_ until the last level settles, which is the entire reason clocks exist. Then switch to **Transistor level** to see what a NAND actually is: two p-type devices in parallel pulling the output up, two n-type devices in series pulling it down, wired so that exactly one network conducts at a time. That duality is why CMOS burns almost no power when it is not switching.

The constructions are worth reading off:

| Gate | NANDs | Construction                              |
| ---- | ----- | ----------------------------------------- |
| NOT  | 1     | $$\overline{A \cdot A} = \bar{A}$$        |
| AND  | 2     | NAND, then invert                         |
| OR   | 3     | invert both inputs, then NAND — De Morgan |
| NOR  | 4     | OR, then invert                           |
| XOR  | 4     | the classic four-gate arrangement         |

The OR case is De Morgan's law made physical: $$\overline{\bar{A} \cdot \bar{B}} = A + B$$. You do not need an OR gate. You need two inverters and a NAND, and the algebra guarantees the result.

This is what a good abstraction looks like from the inside. There is a _cost_ to the abstraction — XOR built from NANDs is four gates and roughly sixteen transistors where a dedicated design is cheaper — and there is a _benefit_, which is that a fab only has to be excellent at manufacturing one thing.

<div class="al-hist" markdown="1">
#### 1854 · Cork, and 1937 · Cambridge, Massachusetts

George Boole published _An Investigation of the Laws of Thought_ in 1854, arguing that logical reasoning obeyed algebraic laws. It was regarded, for eighty years, as an elegant curiosity in philosophy.

Then in 1937 a 21-year-old master's student at MIT named Claude Shannon, who had spent a summer working on Vannevar Bush's differential analyser and had taken a philosophy course as an undergraduate, noticed that a relay circuit is a Boolean expression. His thesis, _A Symbolic Analysis of Relay and Switching Circuits_, showed that switching networks could be _designed_ — written down, simplified algebraically, proven correct — rather than discovered by trial and error on a bench.

It is routinely called the most important master's thesis of the twentieth century, and the claim is hard to argue with. Every layer above this one exists because of it.
</div>

---

## 3 · Arithmetic — the machine learns to add

<span class="al-layer">LAYER 03 · ARITHMETIC</span>

Now the layer where logic becomes _mathematics_, and where I want you to spend the most time.

Binary addition has exactly one interesting case. Adding two bits gives you a result and possibly a carry:

| A   | B   | Sum   | Carry |
| --- | --- | ----- | ----- |
| 0   | 0   | 0     | 0     |
| 0   | 1   | 1     | 0     |
| 1   | 0   | 1     | 0     |
| 1   | 1   | **0** | **1** |

Look at those two output columns. The Sum column is exactly XOR. The Carry column is exactly AND. That is not a coincidence or an analogy — binary addition _is_ those two logic functions, and nothing else:

$$
\boxed{\;S = A \oplus B, \qquad C = A \cdot B\;}
$$

That is a **half adder**. It is useless on its own, because it has nowhere to put a carry coming _in_ from the column to its right. Chain two of them and add an OR, and you get a **full adder**, which takes three inputs and produces a sum and a carry-out:

$$
S = A \oplus B \oplus C_{in}
$$

$$
C_{out} = (A \cdot B) + \big((A \oplus B) \cdot C_{in}\big)
$$

The second equation reads as: carry out if both inputs were 1, _or_ if exactly one input was 1 and a carry arrived. Five gates, about 28 transistors in static CMOS.

Now chain eight of them, feeding each carry-out into the next carry-in, and you have an 8-bit **ripple-carry adder** — the thing that made computers worth building.

### Operate it

Toggle the bits. Press **Step** to advance the carry one stage at a time, or **Run** to watch it ripple. Click any stage box to open up its gate-level schematic below.

<div class="al al-bleed" data-al-module="adder"></div>

Four things to try, in order:

**1. Watch the ripple, and notice it is slow.** Set A to `11111111` and B to `00000001` and press Run. The carry has to walk all the way from bit 0 to bit 7 before the answer is correct. Until it arrives, the upper bits are _wrong_ — they are showing the result of an addition that hasn't finished. The carry path through one full adder is two gate delays ($$C_{in} \rightarrow$$ AND $$\rightarrow$$ OR), so an 8-bit ripple-carry adder takes about 16 gate delays, and a 64-bit one takes about 128. This is why nobody has shipped a plain ripple-carry adder in a CPU for decades: real designs use carry-lookahead, which computes all the carries in parallel from "generate" and "propagate" terms at the cost of far more gates. The clock speed of your computer is, quite directly, a story about how fast a carry can cross a word.

**2. Overflow the thing.** Set both to `11111111` and settle it. The sum reads `11111110` and the carry-out is 1 — the ninth bit that has nowhere to go. 255 + 255 = 510, and the machine tells you 254 with a flag set. The abstraction "these bits are a number" just leaked, and every buffer overflow in history is downstream of exactly this.

**3. Turn on two's complement.** Nothing in the circuit changes. Not one gate, not one wire. All that changes is the _label we put on the same voltages_: the top bit now means $$-128$$ instead of $$+128$$, so `11111111` reads as $$-1$$ rather than 255. This is the purest example of an abstraction in the whole post — a reinterpretation with zero hardware cost, and the reason subtraction needs no separate circuit at all. To compute $$A - B$$ you invert B, set the carry-in to 1, and add. That is why the carry-in toggle exists.

$$
-B = \bar{B} + 1 \quad \Longrightarrow \quad A - B = A + \bar{B} + 1
$$

**4. Now find the honest overflow.** With two's complement on, set A to `01111111` (+127) and B to `00000001` (+1). The result is `10000000`, which as a signed number is $$-128$$. The carry-out is 0, so an unsigned machine would say nothing is wrong. Signed overflow is detected differently — by checking whether the carry _into_ the top bit differs from the carry _out_ of it:

$$
V = C_{7} \oplus C_{8}
$$

Two different notions of "the answer is wrong", living on the same wires, distinguished only by which one you asked for.

---

## 4 · Memory — the wire that remembers

<span class="al-layer">LAYER 04 · STATE</span>

Everything so far is **combinational**: outputs are a pure function of inputs, and the instant you change the inputs the outputs follow. A machine built only from that can compute, but it cannot _keep_ anything. It has no yesterday.

The fix is almost embarrassingly simple. Take two NAND gates and feed each one's output back into the other's input.

The loop has two stable configurations. If the top gate outputs 1, that 1 goes into the bottom gate and forces it to output 0, which goes back into the top gate and holds it at 1. The state is self-consistent — it holds itself up by its own bootstraps. Flip it and the mirror image is equally stable. Two stable states, no external input required: one bit, stored, indefinitely, for as long as the power is on.

Add two more NANDs as a gate — an _enable_ line — and you get a **gated D latch**: when enable is high, Q follows D; when enable is low, the loop clamps shut and holds whatever it had. Add two more again and you get the real thing: an **edge-triggered D flip-flop**, which samples only at the instant the clock rises.

All three are below. Switch between them.

<div class="al al-bleed" data-al-module="latch"></div>

Let the clock run and watch the waveform strip. Then stop the clock and hammer the D button. Nothing happens. That "nothing happens" is the entire point — it is the first time in this whole stack that the machine ignores the present in favour of the past.

Three things to try:

**Find the forbidden state.** On the **SR latch**, pull both S̄ and R̄ low at once. Q and Q̄ both go high — they are supposed to be opposites, and now they are not. The panel labels it FORBIDDEN because that is exactly what it is: an input combination the abstraction "this stores one bit" does not cover.

**See the difference between a latch and a flip-flop.** On the **gated D latch**, hold EN high and change D. Q follows immediately, glitches and all. On the **edge D flip-flop**, hold CLK high and change D as much as you like. Nothing moves until the next rising edge. That distinction is invisible from one layer up, where the abstraction is simply "a register holds a word between clock ticks" — and it becomes extremely visible when a design violates setup or hold time and the flip-flop goes _metastable_, sitting between 0 and 1 for an unbounded period while it makes up its mind.

**Watch the settling counter.** It reports how many gate delays the loop took to reach a consistent state. It is not always the same number, and in the forbidden case it never settles at all.

<div class="al-hist" markdown="1">
#### The promise, and its conditions

Layer 03 promised you clean bits. Layer 04 is where that promise is actually _made_ — and it is conditional on timing, on input combinations staying inside the legal set, and on the loop being given long enough to settle. None of those conditions appear in the interface. They appear in the datasheet, and then in the bug report.
</div>

Eight of those flip-flops side by side, sharing one clock line, is a **register** — an 8-bit word you can hold. That is at the bottom of the panel above: set the D bits, and nothing happens to Q until you press Clock. Wire a few thousand of them into an addressable array and you have RAM. Put a register on each input of the adder from the last section and one on its output, drive them all from a common clock, and you have something new: a machine that does one step of arithmetic per tick and remembers the result. Add a counter that walks through memory deciding _which_ step to do, and you have a computer.

---

## 5 · The stored program — instructions are just data

<span class="al-layer">LAYER 05 · ARCHITECTURE</span>

In June 1945, John von Neumann circulated the _First Draft of a Report on the EDVAC_: a hundred-odd pages, one author's name on the cover, describing work done by a group including J. Presper Eckert and John Mauchly, whose omission caused a patent fight that ran for decades. Its central idea is a single sentence long, and it is the reason the field exists.

> **Put the instructions in the same memory as the data.**

Before this, "programming" a machine meant rewiring it. ENIAC was programmed by plugging cables and setting switches; a change of problem took days. After this, a program is just a pattern of bits sitting in memory, and a pattern of bits in memory is something a program can write. Compilers, interpreters, operating systems, viruses, JIT compilers and every self-modifying trick in the book are all consequences of that one decision.

The machinery required is a loop with four beats:

1. **Fetch** — put the program counter on the address bus, read a byte out of memory into the instruction register.
2. **Decode** — split that byte into an opcode and an operand. This is not an action so much as a wiring fact: certain bits are physically connected to certain control lines.
3. **Execute** — let the ALU, the registers and memory do whatever the opcode says.
4. **Increment** — advance the program counter, unless the instruction just changed it.

Below is a complete machine that does exactly this. Sixteen bytes of RAM, one accumulator, nine opcodes — and a working assembler, so the source in the box is really being translated into the bytes in the grid. Edit it and press **Assemble**; it will tell you off for an unknown mnemonic or an address that does not fit in four bits.

It starts on the same addition the adder above performs — 75 + 54 — so you can watch a number you toggled by hand come out the other end of an instruction stream. The other two programs are worth running as well. **Count down** is a loop: the machine changes its own program counter based on a flag. **Multiply 6 × 7** is the one to sit with, because this machine has no multiply instruction — multiplication is a loop over addition, and you are watching the exact moment where "the hardware cannot do this" becomes "the software will do it anyway".

<div class="al al-bleed" data-al-module="cpu"></div>

Press **Micro-step** repeatedly and watch the four phases light up the data path. The instruction at address 0 is `1E`. In binary that is `0001 1110`: the top four bits are the opcode `0001` = LDA, the bottom four are the operand `1110` = address 14. Address 14 holds `4B`, which is 75.

Then look at what is in memory: bytes `1E 2F 4D E0 F0` are _instructions_, bytes at addresses D, E and F are _data_, and the machine has absolutely no way of telling them apart. Nothing marks one as code. The only thing that makes `4B` "the number 75" rather than "an STA instruction" is that the program counter never points at it. Point the PC there — a bad jump, a corrupted return address — and the machine will happily execute your data. Every control-flow hijacking attack ever written lives in that gap.

<div class="al-hist" markdown="1">
#### 1948 · Manchester

At 11am on 21 June 1948, the Manchester Small-Scale Experimental Machine — the "Baby" — ran a 17-instruction program to find the highest proper factor of 2¹⁸. It took 52 minutes. It was the first time in history that a machine executed a program held in its own electronic memory.

The program was entered by hand, in binary, on a panel of switches. Which is exactly the workflow of the layer above, and exactly the reason somebody was about to get very tired of it.
</div>

---

## 6 · Assembly — the first time a program wrote a program

<span class="al-layer">LAYER 06 · SYMBOLIC</span>

Look again at the disassembly panel in the machine above. The same instruction shown three ways:

```
binary     0001 1110
hex        0x1E
assembly   LDA E
```

All three are the same byte. Only the third is something a human can read at eleven o'clock at night without making a mistake.

The obvious move — obvious in retrospect, radical at the time — is to write the third form and have the _machine_ produce the first. That program is an assembler, and it is the first time in this stack that a tool exists whose only purpose is the comfort of the person using it. The panel in the previous section contains a real one: `LDA x` in the text box becomes the byte `1E` in the memory grid, and the label `x` becomes the number 14, because a two-pass assembler worked out where `x` ended up.

The idea is generally credited to **Kathleen Booth**, who around 1947 designed an assembly language and wrote its assembler for the ARC machine at Birkbeck College, and who co-authored the first book on programming machines of this kind. At Cambridge in 1949, David Wheeler wrote EDSAC's "Initial Orders" — a bootstrap loader that read symbolic instructions from paper tape and converted them as it went — and in the process invented the **subroutine**, still known for years afterwards as the "Wheeler jump".

Two enormously consequential things happen at this layer.

**Names replace addresses.** Write `loop:` instead of `0x2F` and the assembler works out where `loop` ended up. That means you can insert an instruction in the middle of your program without renumbering every jump target by hand — which anyone who has done it once will tell you is the difference between a program you can maintain and a program you rewrite.

**The tool becomes the bottleneck's owner.** From here up, every layer is a program that transforms your text into the layer below. If it has a bug, you have a bug you did not write. This is a trade everyone in this stack has now made a hundred times, usually without noticing.

<div class="al-hist" markdown="1">
#### The resistance

It is easy to forget that every rung of this ladder was argued about. Assembly was resisted by people who pointed out — correctly — that a hand-written binary program was faster and smaller than an assembled one, and that the assembler consumed precious machine time doing clerical work.

They were right about the facts and wrong about the direction. The same argument, almost word for word, would be made about compilers in the 1950s, about high-level languages in the 1960s, about garbage collection in the 1990s, and about AI-generated code in the 2020s. The pattern is consistent: the abstraction is slower, the abstraction wins, and the hardware catches up.
</div>

---

## 7 · Compilers — the machine learns to translate meaning

<span class="al-layer">LAYER 07 · LANGUAGE</span>

An assembler is a substitution: one mnemonic, one instruction. A **compiler** is something else entirely. It reads an expression written in terms of the _problem_ and generates instructions in terms of the _machine_, and the mapping between them is not one to one.

Write `acc += xs[i]` and a compiler must decide which register holds `acc`, whether `xs[i]` is worth keeping in a register across iterations, whether the multiply implied by the array index can be turned into a shift, whether the loop should be unrolled, and whether the whole thing can be replaced by vector instructions. None of those decisions appear in your source. All of them affect the answer's speed by an order of magnitude.

**Grace Hopper** built the first thing worth calling a compiler — the A-0 system, in 1952 — and spent years being told that computers could not be made to write programs. Her account of the reaction is worth quoting from memory: nobody believed it, so she did not talk about it for a while.

**John Backus** and his team at IBM delivered FORTRAN in 1957 with an explicit and unfashionable goal: generate code good enough that programmers would stop hand-writing assembly. It largely worked, and it worked because the compiler was aggressive about optimisation in a way nobody expected. FORTRAN's success is the moment high-level languages stopped being a research topic.

Then the branching:

| Year | Language         | The abstraction it added                                                          |
| ---- | ---------------- | --------------------------------------------------------------------------------- |
| 1957 | FORTRAN          | expressions and loops, compiled competitively                                     |
| 1958 | LISP             | code as data, recursion, garbage collection                                       |
| 1959 | COBOL            | source that a non-specialist can read                                             |
| 1972 | C                | portable systems programming — the same source on machines that did not exist yet |
| 1985 | C++              | abstraction with, in principle, no runtime cost                                   |
| 1991 | Python           | the programmer's time is worth more than the machine's                            |
| 1995 | Java, JavaScript | write once, run on a virtual machine                                              |

C deserves singling out. Dennis Ritchie built it to write Unix in, and the pairing is the reason both spread: an operating system that could be _recompiled_ for a new machine rather than rewritten for it. Before C, porting an OS was a rewrite. After C, it was a build. That is an abstraction whose payoff is measured in decades.

And Python is the moment the trade goes fully explicit. `sum(xs)` is one line. It is also, roughly, fifty times slower than the C loop it replaces, because every integer is a heap-allocated object with a reference count and the interpreter dispatches through a bytecode loop for each step. Guido van Rossum's language won anyway, and the reason is on the right-hand side of the ledger: the human wrote one line instead of six and cannot possibly have made an off-by-one error, because there is no index to be off by.

---

## 8 · Systems — the layers nobody calls a language

<span class="al-layer">LAYER 08 · PLATFORM</span>

Between "your program" and "the CPU" sit several more layers that rarely get named as abstractions, and each is doing enormous work.

**Virtual memory.** Your program believes it has a flat, private address space starting at zero. It does not. A hardware memory-management unit translates every single address your program touches, page by page, into some physical location that may have moved, may be shared with another process, or may currently be on a disk. The abstraction is "you have your own memory". The reality is a translation table walked on every access, backed by a cache — the TLB — whose miss rate you will eventually have to care about.

**Processes and the scheduler.** Your program believes it has a CPU to itself. It is in fact being stopped mid-instruction-stream, having its entire register state written to memory, and being restarted later, thousands of times a second, and it cannot tell. The abstraction is "you are running". The reality is "you are running about 3% of the time".

**Filesystems.** The abstraction is a named byte array you can seek within. The reality underneath has been, at various times, spinning rust with seek latency, flash with erase blocks and wear levelling, and a network. The interface did not change. The performance model changed completely, which is why "it's just a file" is a sentence that has caused a great deal of trouble.

**The network stack.** TCP, specified by Vint Cerf and Bob Kahn in 1974, offers "a reliable ordered stream of bytes" over a substrate that offers nothing of the sort — packets that may be dropped, duplicated, reordered or corrupted. The abstraction is so convincing that a generation of programmers wrote code as though `send()` meant the bytes arrived. It doesn't; it means they were handed to a queue.

**The Web.** In March 1989 Tim Berners-Lee circulated a proposal for a hypertext system at CERN. His manager's note on it — _"Vague, but exciting"_ — is the most famous margin comment in computing. HTTP over TCP over IP over Ethernet over copper over electrons: by the time you click a link, you are standing on at least seven abstraction layers that all have to hold simultaneously.

<div class="al-hist" markdown="1">
#### 2002 · The Law of Leaky Abstractions

In November 2002, Joel Spolsky wrote down the rule that governs this entire post:

> **All non-trivial abstractions, to some degree, are leaky.**

TCP promises reliability but hangs when the cable is unplugged. An SQL query promises you need not think about how rows are fetched, until one runs a thousand times slower than a nearly identical one. An array promises uniform access, until your access pattern falls out of cache and slows by two orders of magnitude.

The corollary is the uncomfortable part, and it applies with full force to the top of this ladder: abstractions save us time working, but they do not save us time _learning_. You still have to understand the layer below — you just get to ignore it most of the time.
</div>

---

## 9 · Learned abstraction — programs nobody wrote

<span class="al-layer">LAYER 09 · STATISTICAL</span>

Every layer up to this point shares a property: a human specified the mapping. Somebody decided that `LDA` means `0001`, that `+` on two `int`s emits an `ADD`, that a page fault triggers a trap. The translations are designed, auditable, and in principle provable.

At this layer that stops.

The idea is old. In 1943, Warren McCulloch and Walter Pitts modelled a neuron as a threshold unit — which is to say, as a logic gate with adjustable weights — and showed such networks could compute logical functions. In 1958 Frank Rosenblatt built the Perceptron, a physical machine with motor-driven potentiometers for weights, and the New York Times reported the Navy expected it to walk, talk, see and write. In 1969 Minsky and Papert pointed out that a single-layer perceptron cannot compute XOR, and funding evaporated for a decade.

The unlock, popularised by Rumelhart, Hinton and Williams in a 1986 _Nature_ paper, was backpropagation: apply the chain rule backwards through a multi-layer network to get the gradient of the error with respect to every weight, then take a small step downhill.

$$
\frac{\partial E}{\partial w_{ij}} = \frac{\partial E}{\partial a_j} \cdot \frac{\partial a_j}{\partial z_j} \cdot \frac{\partial z_j}{\partial w_{ij}} \qquad w_{ij} \leftarrow w_{ij} - \eta \frac{\partial E}{\partial w_{ij}}
$$

That is the whole idea. It is calculus from 1676 applied to a computation graph, and it means you no longer write the function. You write the _shape_ of a family of functions, hand over examples, and let gradient descent pick the member.

Two more things had to arrive. **Compute**: NVIDIA's CUDA in 2007 made GPUs — built to shade triangles — programmable for general matrix work, and in 2012 AlexNet used two of them to win ImageNet by a margin so large the field reorganised around it within a year. And **architecture**: the 2017 paper _Attention Is All You Need_ replaced recurrence with a mechanism where every position attends to every other in parallel, which turned out to scale with data and compute in a way nothing before it had.

$$
\mathrm{Attention}(Q, K, V) = \mathrm{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right)V
$$

Note what has happened to our stack. The weights of a large model are a program. They were not written; they were _fitted_. There is no source file, no commit that explains a particular behaviour, no assembler you can run backwards. The layer is real, it works, and it is not auditable in the way every layer beneath it is.

That is a genuinely new kind of rung, and it is worth being precise about why: for the first time, the translation between one layer and the next is **learned rather than specified**.

---

## 10 · Natural language — the rung we are standing on

<span class="al-layer">LAYER 10 · INTENT</span>

Which brings us to the present, and to the thing that prompted this post.

When you type _"sum the numbers in xs, handle the empty case, and add a test"_ into Claude Code and get back a working function with tests, something has happened that is structurally identical to everything in the eight sections above, and structurally different in one specific way.

**Identical**, because it is the same move: describe the outcome in terms closer to the problem, let a layer below translate it into terms closer to the machine. That is what the assembler did to opcodes and what the compiler did to registers. English is simply the next notation.

**Different**, because the translation is not deterministic. Run an assembler twice on the same input and you get the same bytes, always. Run a compiler twice and you get the same object file. Run a model twice and you may get two different programs, both correct, or one correct and one subtly not. Every layer below this one is a function. This one is a _distribution_.

Explore the whole ladder for one task below — summing a list — and watch what collapses and what does not.

<div class="al al-bleed" data-al-module="ladder"></div>

The left-hand counter falls by six orders of magnitude from the bottom rung to the top. The middle counter — the actual work the machine performs — barely moves. That gap is the whole history of this field in two numbers.

But the honest reading of that chart requires saying what does _not_ collapse:

**The verification burden moves; it does not vanish.** At the assembly rung you checked your registers. At the C rung you checked your pointers. At the Python rung you checked your types. At this rung you check whether the program you were handed actually does what you asked — which is a _harder_ review problem, not an easier one, because plausible-looking wrong code is more expensive to spot than obviously wrong code.

**Every leak below is still a leak.** A model can write you a beautiful `O(n²)` loop that is correct and unusable. It can hand you code that is right on your data and wrong on the carry-out. The layers underneath did not go away when we stopped typing at them — they are all still running, all still leaking, and the person on the hook is still you.

**The specification problem is untouched.** "Sum the numbers in xs" is a complete specification only because summing is trivial. The genuinely hard part of software has always been deciding precisely what to build, and no notation — not FORTRAN, not Python, not English — has ever made that easier. It has only ever made it cheaper to be wrong quickly.

---

## 11 · The whole ladder, in order

<span class="al-layer">LAYER ∞ · THE STACK</span>

Here is the entire thing, bottom to top, with the promise each layer makes and the way each one breaks.

| #   | Layer             | The promise                               | How it leaks                                        |
| --- | ----------------- | ----------------------------------------- | --------------------------------------------------- |
| 00  | Silicon           | a perfect crystal                         | defects, yield, cosmic-ray bit flips                |
| 01  | Transistor        | a clean on/off switch                     | it's an analogue curve; leakage current; heat       |
| 02  | Logic gate        | Boolean algebra, exactly                  | propagation delay, glitches, fan-out limits         |
| 03  | Arithmetic        | these bits are a number                   | overflow, two's complement asymmetry, finite width  |
| 04  | Register / RAM    | the value stays put                       | setup/hold violations, metastability, refresh       |
| 05  | Stored program    | instructions and data                     | code injection, self-modifying surprises            |
| 06  | Assembly          | names instead of addresses                | you now depend on a tool's correctness              |
| 07  | Compiled language | write the problem, not the machine        | undefined behaviour, optimisation surprises         |
| 08  | OS / network      | you have memory, a CPU, a reliable stream | page faults, context switches, partitions           |
| 09  | Learned model     | fit the function from examples            | not auditable; distribution shift; confident errors |
| 10  | Natural language  | describe the outcome                      | non-deterministic; plausible-but-wrong              |

Read that right-hand column top to bottom. It is a list of everything that has ever ruined somebody's week.

<div class="al al-bleed" data-al-module="timeline"></div>

Scrub the timeline and notice how little of it is recent. From Boole to Shannon is 83 years. From Shannon to the transistor is 10. From the transistor to a stored-program machine, 1. The compression is real, but the foundations were laid slowly, by people who had no idea what they were laying them for. Boole thought he was doing philosophy. Leibniz thought binary was partly a theological argument. Shannon was doing a master's degree.

---

## 12 · What one line costs

<span class="al-layer">CLOSING</span>

Let us settle the bill. You type:

```python
total = sum(xs)
```

One line, twelve visible characters of intent. Underneath, for a list of a million integers:

- CPython dispatches roughly **10 million** bytecode operations, because every element involves an iterator protocol call, a reference count increment and decrement, and an overflow check on a boxed integer object.
- Those become on the order of **10⁸ machine instructions** after the interpreter's own overhead.
- Each instruction is a fetch–decode–execute cycle across registers, caches and buses, so call it **10⁹–10¹⁰ elementary logic operations**.
- Each of those is gates switching. At roughly 28 transistors per full adder and dozens of adders and multiplexers active per operation, you are looking at something on the order of **10¹¹ transistor switching events** — a hundred billion physical state changes in doped sand — to add up a million numbers.

And every one of those switches is a MOSFET whose channel forms because a field across a few atoms of oxide pulled electrons into a sliver of silicon that a machine grew as a single perfect crystal out of melted rock.

You did not think about any of it. That is not laziness; that is the _entire achievement_. The measure of this ladder is precisely how much of it you are allowed to ignore.

But — and this is the part worth carrying away — "allowed to ignore" is not "safe to be ignorant of". Every rung on this ladder was resisted by people who understood the rung below extremely well, and every one of them was overruled by economics. And every single time, the people who continued to understand the layer below were the ones who could debug the layer above when it leaked. That was true of the programmers who could read the compiler's output in 1960. It was true of the web developers who understood TCP in 2005. It is true of anyone reviewing generated code today.

We have spent a hundred and seventy years teaching a rock to add, and then teaching ourselves to stop watching it do so. The newest layer is the strangest one yet — the first where we describe what we want instead of how to get it, and the first where the machine below us is guessing rather than translating.

It is a new floor on a very old building. It is worth knowing what is holding it up.

---

## Sources and further reading

1. Boole, G. (1854). _An Investigation of the Laws of Thought_. Walton & Maberly.
2. Shannon, C. E. (1938). A Symbolic Analysis of Relay and Switching Circuits. _Transactions of the AIEE_, 57(12), 713–723. (Master's thesis, MIT, 1937.)
3. Turing, A. M. (1936). On Computable Numbers, with an Application to the Entscheidungsproblem. _Proc. London Mathematical Society_, s2-42(1), 230–265.
4. von Neumann, J. (1945). _First Draft of a Report on the EDVAC_. Moore School of Electrical Engineering, University of Pennsylvania.
5. Booth, A. D. & Booth, K. H. V. (1953). _Automatic Digital Calculators_. Butterworths.
6. Backus, J. (1978). The History of FORTRAN I, II, and III. _ACM SIGPLAN Notices_, 13(8), 165–180.
7. Moore, G. E. (1965). Cramming More Components onto Integrated Circuits. _Electronics_, 38(8).
8. Ritchie, D. M. (1993). The Development of the C Language. _ACM HOPL-II_.
9. Cerf, V. & Kahn, R. (1974). A Protocol for Packet Network Intercommunication. _IEEE Transactions on Communications_, 22(5), 637–648.
10. Rumelhart, D. E., Hinton, G. E. & Williams, R. J. (1986). Learning Representations by Back-propagating Errors. _Nature_, 323, 533–536.
11. Spolsky, J. (2002). [The Law of Leaky Abstractions](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/).
12. Krizhevsky, A., Sutskever, I. & Hinton, G. E. (2012). ImageNet Classification with Deep Convolutional Neural Networks. _NeurIPS_.
13. Vaswani, A. et al. (2017). Attention Is All You Need. [arXiv:1706.03762](https://arxiv.org/abs/1706.03762).
14. Petzold, C. (1999). _Code: The Hidden Language of Computer Hardware and Software_. Microsoft Press. — the book this post is a small animated tribute to.
15. Nisan, N. & Schocken, S. (2005). _The Elements of Computing Systems_. MIT Press. — build the whole ladder yourself, from NAND up.

<script src="{{ '/assets/js/abstraction-ladder.js' | relative_url }}" defer></script>
