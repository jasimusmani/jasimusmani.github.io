/*!
 * abstraction-ladder.js
 * Interactive modules for the post "The Abstraction Ladder".
 * Vanilla ES6, no dependencies. Each module mounts into an element carrying a
 * data-al-module attribute and builds its own DOM.
 *
 * Colours are never hard-coded in the drawing code: every canvas reads the
 * post's CSS custom properties at runtime, so the whole thing follows the
 * site's light/dark toggle. See readPalette() and the theme observer below.
 */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------- *
   * Palette — populated from CSS custom properties, refreshed on theme change
   * ---------------------------------------------------------------------- */

  var C = {
    on: "#39ff7a",
    off: "#1f3a2c",
    amber: "#ffb347",
    cyan: "#58e1ff",
    magenta: "#ff7ad9",
    red: "#ff5f56",
    text: "#8fae9f",
    bright: "#d9ffe9",
    grid: "rgba(57,255,122,0.07)",
    fillOn: "rgba(57,255,122,0.10)",
    fillOff: "rgba(57,255,122,0.03)",
    stroke: "#2f4f3e",
    plot: "rgba(57,255,122,0.12)",
    glow: 1,
  };

  var PALETTE_KEYS = ["on", "off", "amber", "cyan", "magenta", "red", "text", "bright", "grid", "fillOn", "fillOff", "stroke", "plot"];

  function readPalette() {
    var probe = document.querySelector(".al");
    if (!probe) return;
    var cs = window.getComputedStyle(probe);
    PALETTE_KEYS.forEach(function (k) {
      var v = cs.getPropertyValue("--al-c-" + k);
      if (v && v.trim()) C[k] = v.trim();
    });
    var g = cs.getPropertyValue("--al-glow");
    C.glow = g && g.trim() ? parseFloat(g) : 1;
    if (isNaN(C.glow)) C.glow = 1;
  }

  /* Modules register a repaint here so a theme switch redraws every canvas. */
  var repaints = [];
  function onRepaint(fn) {
    repaints.push(fn);
  }
  function repaintAll() {
    readPalette();
    repaints.forEach(function (fn) {
      try {
        fn();
      } catch (e) {
        /* one broken module must not stop the rest repainting */
      }
    });
  }

  function watchTheme() {
    if (!("MutationObserver" in window)) return;
    var last = document.documentElement.getAttribute("data-theme");
    new MutationObserver(function () {
      var now = document.documentElement.getAttribute("data-theme");
      if (now === last) return;
      last = now;
      /* the theme toggle adds a 750ms transition class; repaint on both ends */
      repaintAll();
      window.setTimeout(repaintAll, 60);
      window.setTimeout(repaintAll, 800);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  /* ---------------------------------------------------------------------- *
   * Shared helpers
   * ---------------------------------------------------------------------- */

  var MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

  var RM = false;
  try {
    RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    RM = false;
  }

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k === "html") el.innerHTML = v;
        else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? "" : v);
      });
    }
    (kids || []).forEach(function (kid) {
      if (kid === null || kid === undefined) return;
      el.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    });
    return el;
  }

  function panel(mount, title, badge) {
    mount.textContent = "";
    var head = h("div", { class: "al-head" }, [
      h("span", { class: "al-dot al-dot-r", "aria-hidden": "true" }),
      h("span", { class: "al-dot al-dot-y", "aria-hidden": "true" }),
      h("span", { class: "al-dot al-dot-g", "aria-hidden": "true" }),
      h("span", { class: "al-title", text: title }),
      badge ? h("span", { class: "al-badge", text: badge }) : null,
    ]);
    var body = h("div", { class: "al-body" });
    mount.appendChild(head);
    mount.appendChild(body);
    return body;
  }

  function fit(cv, cssHeight) {
    var dpr = window.devicePixelRatio || 1;
    var w = cv.clientWidth || cv.parentNode.clientWidth || 640;
    cv.style.height = cssHeight + "px";
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round(cssHeight * dpr));
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: cssHeight };
  }

  function grid(ctx, w, hh, step) {
    ctx.save();
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 1;
    for (var x = 0; x <= w; x += step) {
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, hh);
      ctx.stroke();
    }
    for (var y = 0; y <= hh; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function glowOn(ctx, color, amount) {
    if (C.glow > 0) {
      ctx.shadowColor = color;
      ctx.shadowBlur = (amount || 9) * C.glow;
    }
  }

  function wire(ctx, pts, on, color) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = on ? 2.2 : 1.3;
    ctx.strokeStyle = on ? color || C.on : C.off;
    if (on) glowOn(ctx, color || C.on);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.restore();
  }

  function node(ctx, x, y, on, color) {
    ctx.save();
    ctx.fillStyle = on ? color || C.on : C.off;
    if (on) glowOn(ctx, color || C.on, 10);
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function label(ctx, str, x, y, color, size, align) {
    ctx.save();
    ctx.font = (size || 11) + "px " + MONO;
    ctx.fillStyle = color || C.text;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "middle";
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  function box(ctx, x, y, w, hh, on, color, radius) {
    ctx.save();
    ctx.lineWidth = on ? 1.8 : 1.2;
    ctx.strokeStyle = on ? color || C.on : C.stroke;
    ctx.fillStyle = on ? C.fillOn : C.fillOff;
    if (on) glowOn(ctx, color || C.on, 10);
    var r = radius === undefined ? 4 : radius;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, hh, r);
    else ctx.rect(x, y, w, hh);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /* Gate glyphs. Body occupies (x, y, w, hh); returns the output pin. */
  function gate(ctx, type, x, y, w, hh, out) {
    var lit = !!out;
    ctx.save();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = lit ? C.on : C.stroke;
    ctx.fillStyle = lit ? C.fillOn : C.fillOff;
    if (lit) glowOn(ctx, C.on, 10);
    var cy = y + hh / 2;
    ctx.beginPath();
    if (type === "AND" || type === "NAND") {
      var r = hh / 2;
      var bw = w - r - (type === "NAND" ? 6 : 0);
      ctx.moveTo(x, y);
      ctx.lineTo(x + bw - r, y);
      ctx.arc(x + bw - r, cy, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x, y + hh);
      ctx.closePath();
    } else if (type === "OR" || type === "NOR" || type === "XOR" || type === "XNOR") {
      var ow = w - (type === "NOR" || type === "XNOR" ? 6 : 0);
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + ow * 0.55, y, x + ow, cy);
      ctx.quadraticCurveTo(x + ow * 0.55, y + hh, x, y + hh);
      ctx.quadraticCurveTo(x + ow * 0.28, cy, x, y);
      ctx.closePath();
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w - 6, cy);
      ctx.lineTo(x, y + hh);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();

    if (type === "XOR" || type === "XNOR") {
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.quadraticCurveTo(x + w * 0.22, cy, x - 6, y + hh);
      ctx.stroke();
    }
    if (type === "NAND" || type === "NOR" || type === "NOT" || type === "XNOR") {
      ctx.beginPath();
      ctx.arc(x + w - 3, cy, 3.4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    label(ctx, type, x + w * 0.42, cy, lit ? C.bright : C.text, 9, "center");
    return [x + w, cy];
  }

  /* ---------------------------------------------------------------------- *
   * Animation scheduler — one RAF drives every visible module
   * ---------------------------------------------------------------------- */

  var loops = [];
  var raf = null;
  var lastT = 0;

  function pump(t) {
    var dt = Math.min(64, t - lastT);
    lastT = t;
    for (var i = 0; i < loops.length; i++) {
      if (loops[i].visible) loops[i].tick(dt, t);
    }
    raf = window.requestAnimationFrame(pump);
  }

  function addLoop(el, tick) {
    var item = { visible: !("IntersectionObserver" in window), tick: tick };
    loops.push(item);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            item.visible = e.isIntersecting;
          });
        },
        { rootMargin: "160px 0px" }
      ).observe(el);
    }
    if (raf === null) {
      lastT = window.performance ? performance.now() : Date.now();
      raf = window.requestAnimationFrame(pump);
    }
    return item;
  }

  function onResize(el, fn) {
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        fn();
      }).observe(el);
    } else {
      window.addEventListener("resize", fn);
    }
  }

  /* ---------------------------------------------------------------------- *
   * Small utilities
   * ---------------------------------------------------------------------- */

  function bits2num(bits) {
    var n = 0;
    for (var i = bits.length - 1; i >= 0; i--) n = n * 2 + bits[i];
    return n;
  }

  function bitstr(bits) {
    var s = "";
    for (var i = bits.length - 1; i >= 0; i--) s += bits[i];
    return s;
  }

  function hex2(n) {
    return "0x" + ("0" + (n & 0xff).toString(16).toUpperCase()).slice(-2);
  }

  function bin8(n) {
    return ("0000000" + (n & 0xff).toString(2)).slice(-8);
  }

  function signed8(n) {
    return n > 127 ? n - 256 : n;
  }

  function btn(text, cls, fn) {
    return h("button", { type: "button", class: "al-btn " + (cls || ""), onclick: fn, text: text });
  }

  function toggleBtn(label, initial, onChange, cls) {
    var st = { v: initial ? 1 : 0 };
    var b = h("button", {
      type: "button",
      class: "al-bit " + (cls || "") + (initial ? " is-on" : ""),
      role: "switch",
      "aria-checked": initial ? "true" : "false",
      "aria-label": label,
      text: String(st.v),
      onclick: function () {
        st.v = st.v ? 0 : 1;
        b.textContent = String(st.v);
        b.setAttribute("aria-checked", st.v ? "true" : "false");
        b.classList.toggle("is-on", !!st.v);
        onChange(st.v);
      },
    });
    b.set = function (v) {
      st.v = v ? 1 : 0;
      b.textContent = String(st.v);
      b.setAttribute("aria-checked", st.v ? "true" : "false");
      b.classList.toggle("is-on", !!st.v);
    };
    b.get = function () {
      return st.v;
    };
    return b;
  }

  function tabs(names, initial, onPick, ariaLabel) {
    var wrap = h("div", { class: "al-tabs", role: "tablist", "aria-label": ariaLabel || "View" });
    var els = names.map(function (nm) {
      var b = h("button", {
        type: "button",
        role: "tab",
        class: "al-tab" + (nm === initial ? " is-on" : ""),
        "aria-selected": nm === initial ? "true" : "false",
        text: nm,
        onclick: function () {
          onPick(nm);
        },
      });
      wrap.appendChild(b);
      return b;
    });
    wrap.select = function (nm) {
      els.forEach(function (b) {
        b.classList.toggle("is-on", b.textContent === nm);
        b.setAttribute("aria-selected", b.textContent === nm ? "true" : "false");
      });
    };
    return wrap;
  }

  function statCell(k) {
    var v = h("span", { class: "al-stat-v", text: "—" });
    return { el: h("div", { class: "al-stat" }, [h("span", { class: "al-stat-k", text: k }), v]), v: v };
  }

  function slider(labelText, min, max, step, value, onInput, wide) {
    var input = h("input", {
      type: "range",
      min: String(min),
      max: String(max),
      step: String(step),
      value: String(value),
      class: "al-range" + (wide ? " al-range-wide" : ""),
      "aria-label": labelText,
      oninput: function () {
        onInput(parseFloat(input.value));
      },
    });
    return input;
  }

  /* Canvases keep a legible minimum width and scroll sideways on small
     screens. The region is focusable so it can be scrolled from the keyboard,
     and named so that name is not empty. Every diagram has a text equivalent
     beside it. */
  function canvasWrap(cv, name) {
    return h("div", { class: "al-canvas-wrap", tabindex: "0", role: "group", "aria-label": name + " (diagram — scroll sideways to see all of it)" }, [
      cv,
    ]);
  }

  /* Unit-delay logic simulation. Nodes are evaluated from the previous state,
     then swapped in together — which is what real gates do, and what lets a
     cross-coupled pair oscillate instead of silently picking a fixed point. */
  function settleUnitDelay(state, evalFn, maxIter) {
    var iter = maxIter || 60;
    for (var i = 0; i < iter; i++) {
      var next = evalFn(state);
      var same = true;
      for (var k = 0; k < next.length; k++) {
        if (next[k] !== state[k]) same = false;
      }
      state = next;
      if (same) return { state: state, stable: true, steps: i + 1 };
    }
    return { state: state, stable: false, steps: iter };
  }

  /* ====================================================================== *
   * MODULE: adder — 8-bit ripple-carry adder, gate level
   * ====================================================================== */

  function initAdder(mount) {
    var body = panel(mount, "8-BIT RIPPLE-CARRY ADDER — GATE LEVEL", "LIVE");

    var st = {
      a: [1, 1, 0, 1, 0, 0, 1, 0], // LSB first -> 0b01001011 = 75
      b: [0, 1, 1, 0, 1, 1, 0, 0], // 0b00110110 = 54
      cin: 0,
      resolved: 0,
      running: false,
      speed: 1,
      stage: 0,
      signed: false,
      showGP: false,
      acc: 0,
      pulse: 0,
    };

    function compute() {
      var carry = [st.cin],
        sum = [],
        gen = [],
        prop = [];
      for (var i = 0; i < 8; i++) {
        var a = st.a[i],
          b = st.b[i],
          c = carry[i];
        gen[i] = a & b;
        prop[i] = a ^ b;
        sum[i] = a ^ b ^ c;
        carry[i + 1] = gen[i] | (prop[i] & c);
      }
      return { sum: sum, carry: carry, gen: gen, prop: prop };
    }

    function bitRow(name, key) {
      var cells = [];
      var row = h("div", { class: "al-bitrow" });
      row.appendChild(h("span", { class: "al-bitlabel", text: name }));
      for (var i = 7; i >= 0; i--) {
        (function (idx) {
          var b = h("button", {
            type: "button",
            class: "al-bit",
            role: "switch",
            "aria-checked": st[key][idx] ? "true" : "false",
            "aria-label": name + " bit " + idx + " (value " + Math.pow(2, idx) + ")",
            text: String(st[key][idx]),
            onclick: function () {
              st[key][idx] = st[key][idx] ? 0 : 1;
              st.resolved = 0;
              st.running = false;
              refresh();
            },
          });
          cells[idx] = b;
          row.appendChild(b);
        })(i);
      }
      var read = h("span", { class: "al-bitread" });
      row.appendChild(read);
      return { row: row, cells: cells, read: read };
    }

    var rowA = bitRow("A", "a");
    var rowB = bitRow("B", "b");

    var cinBtn = toggleBtn(
      "Carry in",
      false,
      function (v) {
        st.cin = v;
        st.resolved = 0;
        st.running = false;
        refresh();
      },
      "al-bit-c"
    );

    var cinRow = h("div", { class: "al-bitrow al-cinrow" }, [h("span", { class: "al-bitlabel", text: "C₀" }), cinBtn]);

    var chain = h("canvas", { class: "al-canvas", "aria-hidden": "true" });
    var gates = h("canvas", { class: "al-canvas", "aria-hidden": "true" });

    var stepBtn = btn("Step ▸", "", function () {
      st.running = false;
      if (st.resolved < 8) st.resolved++;
      st.stage = Math.min(7, st.resolved > 0 ? st.resolved - 1 : 0);
      st.pulse = 1;
      refresh();
    });
    var runBtn = btn("Run ▶", "al-btn-go", function () {
      if (st.resolved >= 8) st.resolved = 0;
      st.running = !st.running;
      st.acc = 0;
      refresh();
    });
    var resetBtn = btn("Reset ↺", "", function () {
      st.resolved = 0;
      st.running = false;
      st.acc = 0;
      refresh();
    });
    var randBtn = btn("Randomise", "", function () {
      for (var i = 0; i < 8; i++) {
        st.a[i] = Math.random() < 0.5 ? 0 : 1;
        st.b[i] = Math.random() < 0.5 ? 0 : 1;
      }
      st.resolved = 0;
      st.running = false;
      refresh();
    });

    var speed = slider("Propagation speed", 0.25, 4, 0.25, 1, function (v) {
      st.speed = v;
    });

    var signedBox = h("input", {
      type: "checkbox",
      id: "al-signed",
      class: "al-check",
      onchange: function () {
        st.signed = signedBox.checked;
        refresh();
      },
    });
    var gpBox = h("input", {
      type: "checkbox",
      id: "al-gp",
      class: "al-check",
      onchange: function () {
        st.showGP = gpBox.checked;
        refresh();
      },
    });

    var controls = h("div", { class: "al-controls" }, [
      stepBtn,
      runBtn,
      resetBtn,
      randBtn,
      h("label", { class: "al-ctl", for: "al-signed" }, [signedBox, h("span", { text: "two’s complement" })]),
      h("label", { class: "al-ctl", for: "al-gp" }, [gpBox, h("span", { text: "generate / propagate" })]),
      h("label", { class: "al-ctl" }, [h("span", { text: "speed" }), speed]),
    ]);

    var sA = statCell("A"),
      sB = statCell("B"),
      sSum = statCell("SUM"),
      sHex = statCell("HEX"),
      sCout = statCell("C₈"),
      sOvf = statCell("OVERFLOW"),
      sDelay = statCell("GATE DELAY"),
      sLook = statCell("IF LOOKAHEAD");
    var stats = h("div", { class: "al-stats" }, [sA.el, sB.el, sSum.el, sHex.el, sCout.el, sOvf.el, sDelay.el, sLook.el]);

    var ttBody = h("tbody");
    var tt = h("table", { class: "al-tt" }, [
      h("caption", { class: "al-tt-cap", text: "Full-adder truth table — the highlighted row is the stage selected above" }),
      h("thead", {}, [
        h("tr", {}, [
          h("th", { scope: "col", text: "A" }),
          h("th", { scope: "col", text: "B" }),
          h("th", { scope: "col", text: "Cᵢₙ" }),
          h("th", { scope: "col", text: "SUM" }),
          h("th", { scope: "col", text: "Cₒᵤₜ" }),
        ]),
      ]),
      ttBody,
    ]);
    for (var r = 0; r < 8; r++) {
      var A0 = (r >> 2) & 1,
        B0 = (r >> 1) & 1,
        Ci0 = r & 1;
      ttBody.appendChild(
        h("tr", {}, [
          h("td", { text: String(A0) }),
          h("td", { text: String(B0) }),
          h("td", { text: String(Ci0) }),
          h("td", { text: String(A0 ^ B0 ^ Ci0) }),
          h("td", { text: String((A0 & B0) | ((A0 ^ B0) & Ci0)) }),
        ])
      );
    }

    var live = h("p", { class: "al-live", role: "status", "aria-live": "polite" });
    var stageNote = h("p", { class: "al-note" });

    body.appendChild(h("div", { class: "al-inputs" }, [rowA.row, rowB.row, cinRow]));
    body.appendChild(canvasWrap(chain, "Carry chain across eight full adders"));
    body.appendChild(controls);
    body.appendChild(canvasWrap(gates, "Gate-level schematic of one full adder"));
    body.appendChild(stageNote);
    body.appendChild(stats);
    body.appendChild(live);
    body.appendChild(tt);

    function drawChain() {
      var HH = st.showGP ? 152 : 132;
      var f = fit(chain, HH);
      var ctx = f.ctx,
        w = f.w;
      ctx.clearRect(0, 0, w, HH);
      grid(ctx, w, HH, 22);

      var res = compute();
      var padL = 62,
        padR = 26;
      var cellW = (w - padL - padR) / 8;
      var boxW = Math.min(cellW - 10, 62);
      var boxH = 46;
      var top = 46;

      label(ctx, "MSB", padL + cellW * 0.5, 22, C.text, 10, "center");
      label(ctx, "LSB", padL + cellW * 7.5, 22, C.text, 10, "center");
      label(ctx, "← the carry travels this way", padL + cellW * 4, HH - 8, C.text, 10, "center");

      for (var k = 0; k < 8; k++) {
        var i = 7 - k;
        var cx = padL + k * cellW + (cellW - boxW) / 2;
        var settled = i < st.resolved;
        var isSel = i === st.stage;
        var carryIn = res.carry[i];
        var carryOut = res.carry[i + 1];

        if (k < 7) {
          wire(
            ctx,
            [
              [cx + boxW + 6, top + boxH / 2],
              [cx + boxW + (cellW - boxW), top + boxH / 2],
            ],
            settled && carryIn === 1,
            C.amber
          );
        }

        box(ctx, cx, top, boxW, boxH, isSel, isSel ? C.cyan : C.on);
        if (settled && !isSel) {
          ctx.save();
          ctx.strokeStyle = C.on;
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 1.2;
          ctx.strokeRect(cx, top, boxW, boxH);
          ctx.restore();
        }

        label(ctx, "FA" + i, cx + boxW / 2, top + 13, isSel ? C.cyan : C.text, 10, "center");
        label(ctx, settled ? String(res.sum[i]) : "?", cx + boxW / 2, top + 33, settled ? (res.sum[i] ? C.on : C.text) : C.off, 16, "center");
        label(ctx, String(st.a[i]) + " " + String(st.b[i]), cx + boxW / 2, top - 12, C.text, 10, "center");
        label(ctx, settled ? "S" + i : "·", cx + boxW / 2, top + boxH + 14, C.text, 9, "center");

        if (st.showGP) {
          label(ctx, "G" + res.gen[i] + " P" + res.prop[i], cx + boxW / 2, top + boxH + 28, res.gen[i] ? C.amber : C.text, 9, "center");
        }

        if (st.running && i === st.resolved) {
          ctx.save();
          ctx.strokeStyle = C.amber;
          ctx.lineWidth = 2;
          glowOn(ctx, C.amber, 16);
          ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(st.acc * 6));
          ctx.strokeRect(cx - 3, top - 3, boxW + 6, boxH + 6);
          ctx.restore();
        }
        node(ctx, cx + boxW + 6, top + boxH / 2, settled && carryOut === 1, C.amber);
      }

      var coutSettled = st.resolved >= 8;
      wire(
        ctx,
        [
          [padL - 16, top + boxH / 2],
          [padL, top + boxH / 2],
        ],
        coutSettled && res.carry[8] === 1,
        C.amber
      );
      label(ctx, "C₈=" + (coutSettled ? res.carry[8] : "?"), padL - 20, top + boxH / 2, coutSettled && res.carry[8] ? C.amber : C.text, 10, "right");
    }

    function drawGates() {
      var HH = 250;
      var f = fit(gates, HH);
      var ctx = f.ctx,
        w = f.w;
      ctx.clearRect(0, 0, w, HH);
      grid(ctx, w, HH, 22);

      var res = compute();
      var i = st.stage;
      var settled = i < st.resolved;
      var A = st.a[i],
        B = st.b[i],
        Ci = res.carry[i];
      var x1 = A ^ B,
        s = x1 ^ Ci,
        a1 = A & B,
        a2 = x1 & Ci,
        co = a1 | a2;

      var gw = Math.min(70, w * 0.13),
        gh = 34;
      var colA = w * 0.2,
        colB = w * 0.47,
        colC = w * 0.72;
      var inX = w * 0.06;
      var yA = 40,
        yB = 74,
        yC = 150;

      label(ctx, "FULL ADDER — STAGE " + i, w / 2, 14, C.cyan, 11, "center");
      label(ctx, "A" + i + "=" + A, inX - 6, yA, A ? C.on : C.text, 11, "right");
      label(ctx, "B" + i + "=" + B, inX - 6, yB, B ? C.on : C.text, 11, "right");
      label(ctx, "C" + i + "=" + (settled ? Ci : "?"), inX - 6, yC, settled && Ci ? C.amber : C.text, 11, "right");

      var xor1Y = (yA + yB) / 2 - gh / 2;
      wire(
        ctx,
        [
          [inX, yA],
          [colA, yA],
          [colA, xor1Y + gh * 0.3],
        ],
        A === 1,
        C.on
      );
      wire(
        ctx,
        [
          [inX, yB],
          [colA, yB],
          [colA, xor1Y + gh * 0.7],
        ],
        B === 1,
        C.on
      );
      var o1 = gate(ctx, "XOR", colA, xor1Y, gw, gh, settled && x1);

      var and1Y = yB + 46;
      wire(
        ctx,
        [
          [colA - 14, yA],
          [colA - 14, and1Y + gh * 0.3],
          [colA, and1Y + gh * 0.3],
        ],
        A === 1,
        C.on
      );
      wire(
        ctx,
        [
          [colA - 8, yB],
          [colA - 8, and1Y + gh * 0.7],
          [colA, and1Y + gh * 0.7],
        ],
        B === 1,
        C.on
      );
      var o2 = gate(ctx, "AND", colA, and1Y, gw, gh, settled && a1);

      var xor2Y = 40;
      wire(ctx, [o1, [colB - 16, o1[1]], [colB - 16, xor2Y + gh * 0.3], [colB, xor2Y + gh * 0.3]], settled && x1 === 1, C.on);
      wire(
        ctx,
        [
          [inX, yC],
          [colB - 30, yC],
          [colB - 30, xor2Y + gh * 0.7],
          [colB, xor2Y + gh * 0.7],
        ],
        settled && Ci === 1,
        C.amber
      );
      var o3 = gate(ctx, "XOR", colB, xor2Y, gw, gh, settled && s);

      var and2Y = 110;
      wire(
        ctx,
        [
          [colB - 16, o1[1]],
          [colB - 16, and2Y + gh * 0.3],
          [colB, and2Y + gh * 0.3],
        ],
        settled && x1 === 1,
        C.on
      );
      wire(
        ctx,
        [
          [colB - 30, yC],
          [colB - 30, and2Y + gh * 0.7],
          [colB, and2Y + gh * 0.7],
        ],
        settled && Ci === 1,
        C.amber
      );
      var o4 = gate(ctx, "AND", colB, and2Y, gw, gh, settled && a2);

      var orY = 180;
      wire(ctx, [o2, [colC - 20, o2[1]], [colC - 20, orY + gh * 0.72], [colC, orY + gh * 0.72]], settled && a1 === 1, C.amber);
      wire(ctx, [o4, [colC - 34, o4[1]], [colC - 34, orY + gh * 0.28], [colC, orY + gh * 0.28]], settled && a2 === 1, C.amber);
      var o5 = gate(ctx, "OR", colC, orY, gw, gh, settled && co);

      wire(ctx, [o3, [w - 54, o3[1]]], settled && s === 1, C.on);
      label(ctx, "S" + i + " = " + (settled ? s : "?"), w - 50, o3[1], settled && s ? C.on : C.text, 12, "left");
      wire(ctx, [o5, [w - 54, o5[1]]], settled && co === 1, C.amber);
      label(ctx, "C" + (i + 1) + " = " + (settled ? co : "?"), w - 50, o5[1], settled && co ? C.amber : C.text, 12, "left");

      label(ctx, "5 gates · ≈28 transistors in static CMOS · carry path Cᵢₙ → AND → OR = 2 gate delays", w / 2, HH - 10, C.text, 10, "center");
    }

    function refresh() {
      var res = compute();
      for (var i = 0; i < 8; i++) {
        rowA.cells[i].textContent = String(st.a[i]);
        rowA.cells[i].setAttribute("aria-checked", st.a[i] ? "true" : "false");
        rowA.cells[i].classList.toggle("is-on", !!st.a[i]);
        rowB.cells[i].textContent = String(st.b[i]);
        rowB.cells[i].setAttribute("aria-checked", st.b[i] ? "true" : "false");
        rowB.cells[i].classList.toggle("is-on", !!st.b[i]);
      }
      cinBtn.set(st.cin);

      var na = bits2num(st.a),
        nb = bits2num(st.b),
        ns = bits2num(res.sum);
      var done = st.resolved >= 8;

      rowA.read.textContent = "= " + (st.signed ? signed8(na) : na);
      rowB.read.textContent = "= " + (st.signed ? signed8(nb) : nb);

      sA.v.textContent = bitstr(st.a) + " (" + (st.signed ? signed8(na) : na) + ")";
      sB.v.textContent = bitstr(st.b) + " (" + (st.signed ? signed8(nb) : nb) + ")";
      sSum.v.textContent = done
        ? bitstr(res.sum) + " (" + (st.signed ? signed8(ns) : ns) + ")"
        : new Array(8 - st.resolved + 1).join("░") + bitstr(res.sum).slice(8 - st.resolved);
      sHex.v.textContent = done ? hex2(ns) : "—";
      sCout.v.textContent = done ? String(res.carry[8]) : "—";
      var ovf = res.carry[8] ^ res.carry[7];
      sOvf.v.textContent = done ? (st.signed ? (ovf ? "YES — signed result wrong" : "no") : res.carry[8] ? "carry out set" : "no") : "—";
      sOvf.el.classList.toggle("is-alert", done && !!(st.signed ? ovf : res.carry[8]));
      sDelay.v.textContent = st.resolved * 2 + " / 16";
      sLook.v.textContent = "4 gate delays";

      runBtn.textContent = st.running ? "Pause ⏸" : "Run ▶";
      stageNote.textContent = "Showing stage " + st.stage + ". Click a stage box above, or press Step to advance the carry.";

      var rowIdx = (st.a[st.stage] << 2) | (st.b[st.stage] << 1) | res.carry[st.stage];
      Array.prototype.forEach.call(ttBody.children, function (tr, idx) {
        tr.classList.toggle("is-active", idx === rowIdx && st.stage < st.resolved);
      });

      live.textContent = done
        ? "Settled: " + na + " + " + nb + (st.cin ? " + 1" : "") + " = " + ns + " (binary " + bitstr(res.sum) + "), carry out " + res.carry[8] + "."
        : "Propagating: " + st.resolved + " of 8 stages settled.";

      drawChain();
      drawGates();
    }

    chain.addEventListener("click", function (ev) {
      var rect = chain.getBoundingClientRect();
      var k = Math.floor(((ev.clientX - rect.left) / rect.width) * 8);
      st.stage = 7 - Math.max(0, Math.min(7, k));
      refresh();
    });

    addLoop(mount, function (dt) {
      if (RM) return;
      st.acc += dt / 1000;
      if (st.running) {
        st.pulse += (dt / 1000) * st.speed;
        if (st.pulse >= 0.45) {
          st.pulse = 0;
          st.resolved++;
          st.stage = Math.min(7, st.resolved - 1);
          if (st.resolved >= 8) {
            st.resolved = 8;
            st.running = false;
          }
          refresh();
          return;
        }
        drawChain();
      }
    });

    onResize(mount, function () {
      drawChain();
      drawGates();
    });
    onRepaint(refresh);
    if (RM) st.resolved = 8;
    refresh();
  }

  /* ====================================================================== *
   * MODULE: fab — sand to wafer to die, six animated stages
   * ====================================================================== */

  var FAB = [
    {
      k: "01",
      t: "QUARTZ SAND",
      d: "Silica, SiO₂. Silicon is 27.7% of the Earth’s crust by mass, and essentially all of it is bound to oxygen.",
      stats: [
        ["FEEDSTOCK", "SiO₂ quartz"],
        ["CRUST ABUNDANCE", "27.7% by mass"],
        ["PURITY", "~99% (as mined)"],
      ],
    },
    {
      k: "02",
      t: "REDUCTION + SIEMENS",
      d: "Carbothermic reduction in an arc furnace, then trichlorosilane decomposed onto a hot rod until impurities fall below one atom in 10¹¹.",
      stats: [
        ["FURNACE", "1900 °C"],
        ["PURITY", "→ 99.999999999%"],
        ["IMPURITIES", "1 in 10¹¹ atoms"],
      ],
    },
    {
      k: "03",
      t: "CZOCHRALSKI PULL",
      d: "A seed crystal is dipped into the melt and withdrawn while rotating. The result is one continuous crystal lattice, two metres long.",
      stats: [
        ["MELT", "1414 °C"],
        ["PULL RATE", "≈1 mm/min"],
        ["DIAMETER", "300 mm"],
      ],
    },
    {
      k: "04",
      t: "SLICE + POLISH",
      d: "The boule is sawn into wafers and polished until the surface varies by less than a nanometre across 300 millimetres.",
      stats: [
        ["THICKNESS", "775 µm"],
        ["FLATNESS", "< 1 nm"],
        ["ORIENTATION", "⟨100⟩ notch"],
      ],
    },
    {
      k: "05",
      t: "EUV LITHOGRAPHY",
      d: "Tin droplets are vaporised by a laser 50,000 times a second to make 13.5 nm light, which is bounced off mirrors through a mask onto the resist.",
      stats: [
        ["WAVELENGTH", "13.5 nm"],
        ["DROPLETS", "50,000 / s"],
        ["OPTICS", "vacuum, mirrors only"],
      ],
    },
    {
      k: "06",
      t: "IMPLANT → DIE",
      d: "Boron and phosphorus ions are fired into the lattice to form source and drain. The wafer is then diced, and the dead dies are thrown away.",
      stats: [
        ["DOSE", "≈10¹⁵ ions/cm²"],
        ["PER DIE", "up to ~10¹¹ devices"],
        ["YIELD", "never 100%"],
      ],
    },
  ];

  function initFab(mount) {
    var body = panel(mount, "SAND → WAFER → DIE", "6 STAGES");
    var cv = h("canvas", { class: "al-canvas", "aria-hidden": "true" });
    var st = { i: 0, t: 0, auto: !RM };

    var tabEls = [];
    var tabRow = h("div", { class: "al-tabs", role: "tablist", "aria-label": "Fabrication stage" });
    FAB.forEach(function (s, idx) {
      var b = h("button", {
        type: "button",
        role: "tab",
        class: "al-tab" + (idx === 0 ? " is-on" : ""),
        "aria-selected": idx === 0 ? "true" : "false",
        text: s.k + " " + s.t,
        onclick: function () {
          st.i = idx;
          st.t = 0;
          refresh();
        },
      });
      tabRow.appendChild(b);
      tabEls.push(b);
    });

    var bar = h("div", { class: "al-progress-fill" });
    var progress = h("div", { class: "al-progress" }, [bar]);
    var cap = h("p", { class: "al-cap", role: "status", "aria-live": "polite" });
    var statWrap = h("div", { class: "al-stats" });
    var autoBtn = btn(RM ? "Autoplay ▶" : "Pause ⏸", "al-btn-go", function () {
      st.auto = !st.auto;
      autoBtn.textContent = st.auto ? "Pause ⏸" : "Autoplay ▶";
    });
    var prevBtn = btn("◂ Prev", "", function () {
      st.i = (st.i + FAB.length - 1) % FAB.length;
      st.t = 0;
      refresh();
    });
    var nextBtn = btn("Next ▸", "", function () {
      st.i = (st.i + 1) % FAB.length;
      st.t = 0;
      refresh();
    });

    body.appendChild(tabRow);
    body.appendChild(canvasWrap(cv, "Silicon fabrication stage"));
    body.appendChild(progress);
    body.appendChild(h("div", { class: "al-controls" }, [prevBtn, autoBtn, nextBtn]));
    body.appendChild(cap);
    body.appendChild(statWrap);

    var DUR = 6;

    function lattice(ctx, cx, cy, r, t) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = C.on;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1;
      var s = 16;
      for (var gx = -r; gx <= r; gx += s) {
        for (var gy = -r; gy <= r; gy += s) {
          var px = cx + gx + ((t * 6) % s),
            py = cy + gy;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + s, py);
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + s);
          ctx.stroke();
          ctx.fillStyle = C.on;
          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = C.cyan;
      ctx.lineWidth = 1.6;
      glowOn(ctx, C.cyan, 10);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    function draw() {
      var HH = 268;
      var f = fit(cv, HH);
      var ctx = f.ctx,
        w = f.w;
      ctx.clearRect(0, 0, w, HH);
      grid(ctx, w, HH, 22);
      var cx = w / 2,
        cy = HH / 2 + 10;
      var p = Math.min(1, st.t / DUR);
      var t = st.t;

      if (st.i === 0) {
        var seed = 1;
        var rnd = function () {
          seed = (seed * 16807) % 2147483647;
          return seed / 2147483647;
        };
        ctx.save();
        for (var g = 0; g < 560; g++) {
          var gx = 16 + rnd() * (w - 32),
            gy = 46 + rnd() * (HH - 78);
          ctx.fillStyle = g % 9 === 0 ? C.on : C.text;
          ctx.globalAlpha = 0.18 + 0.5 * Math.abs(Math.sin(t * 1.4 + g * 0.7));
          ctx.fillRect(gx, gy, 1 + Math.floor(rnd() * 3), 1 + Math.floor(rnd() * 3));
        }
        ctx.restore();
        var mx = w * 0.25 + w * 0.5 * (0.5 + 0.5 * Math.sin(t * 0.7));
        lattice(ctx, mx, cy, 52, t);
        label(ctx, "one SiO₂ tetrahedron per node", mx, cy + 68, C.cyan, 10, "center");
      } else if (st.i === 1) {
        var temp = 25 + (1900 - 25) * p;
        var grd = ctx.createLinearGradient(0, cy - 40, 0, cy + 46);
        grd.addColorStop(0, C.amber);
        grd.addColorStop(1, C.red);
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.6 * p;
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 34, 118, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        for (var b1 = 0; b1 < 18; b1++) {
          var bx = cx - 100 + ((b1 * 53 + t * 60) % 200);
          var by = cy + 34 - (((t * 40 + b1 * 21) % 80) + 6);
          ctx.save();
          ctx.globalAlpha = 0.5 * p;
          ctx.fillStyle = C.amber;
          ctx.beginPath();
          ctx.arc(bx, by, 1.6 + (b1 % 3), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        wire(
          ctx,
          [
            [cx - 60, 52],
            [cx - 60, cy - 10],
          ],
          true,
          C.amber
        );
        wire(
          ctx,
          [
            [cx + 60, 52],
            [cx + 60, cy - 10],
          ],
          true,
          C.amber
        );
        label(ctx, "electrodes", cx, 42, C.text, 10, "center");
        label(ctx, Math.round(temp) + " °C", cx, cy + 86, C.amber, 16, "center");
        var nines = Math.min(11, Math.floor(p * 11));
        label(ctx, "99." + new Array(nines + 1).join("9") + "% Si", cx, cy + 108, C.on, 13, "center");
      } else if (st.i === 2) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = C.amber;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 74, 96, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        var top = cy + 74 - 150 * p;
        var bw = 30;
        ctx.save();
        ctx.strokeStyle = C.on;
        ctx.lineWidth = 1.8;
        glowOn(ctx, C.on, 12);
        ctx.beginPath();
        ctx.moveTo(cx - bw, cy + 74);
        ctx.lineTo(cx - bw * (0.35 + 0.65 * (1 - p)), top);
        ctx.lineTo(cx + bw * (0.35 + 0.65 * (1 - p)), top);
        ctx.lineTo(cx + bw, cy + 74);
        ctx.stroke();
        ctx.restore();
        /* rotation shown as helical striations climbing the boule */
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = C.on;
        ctx.lineWidth = 1;
        for (var s2 = 0; s2 < 14; s2++) {
          var yy = cy + 70 - s2 * ((cy + 70 - top) / 14);
          var ph = Math.sin(t * 2.4 + s2 * 0.5) * (bw * 0.5);
          ctx.beginPath();
          ctx.moveTo(cx - bw + 4, yy);
          ctx.quadraticCurveTo(cx + ph, yy - 3, cx + bw - 4, yy);
          ctx.stroke();
        }
        ctx.restore();
        label(ctx, "seed ↑ pulled " + Math.round(p * 200) + " cm", cx, 34, C.on, 12, "center");
        label(ctx, "rotating " + (10 + Math.round(5 * Math.abs(Math.sin(t)))) + " rpm", cx, HH - 16, C.text, 10, "center");
      } else if (st.i === 3) {
        var R = 82;
        ctx.save();
        ctx.strokeStyle = C.on;
        ctx.lineWidth = 1.8;
        glowOn(ctx, C.on, 14);
        ctx.beginPath();
        ctx.arc(cx, cy, R, Math.PI * 0.62, Math.PI * 0.38, false);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = C.on;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.clip();
        for (var lx = -R; lx <= R; lx += 13) {
          ctx.beginPath();
          ctx.moveTo(cx + lx, cy - R);
          ctx.lineTo(cx + lx, cy + R);
          ctx.stroke();
        }
        for (var ly = -R; ly <= R; ly += 13) {
          ctx.beginPath();
          ctx.moveTo(cx - R, cy + ly);
          ctx.lineTo(cx + R, cy + ly);
          ctx.stroke();
        }
        ctx.restore();
        /* saw pass */
        var sawX = -R + 2 * R * ((t * 0.5) % 1);
        wire(
          ctx,
          [
            [cx + sawX, cy - R - 14],
            [cx + sawX, cy + R + 14],
          ],
          true,
          C.cyan
        );
        label(ctx, "wire saw", cx + sawX, cy - R - 24, C.cyan, 9, "center");
        label(ctx, "300 mm · 775 µm · one crystal", cx, HH - 16, C.text, 10, "center");
      } else if (st.i === 4) {
        /* source, mask, wafer */
        var srcX = w * 0.13;
        ctx.save();
        for (var d = 0; d < 6; d++) {
          var dy = 46 + ((t * 90 + d * 22) % 70);
          ctx.fillStyle = C.text;
          ctx.beginPath();
          ctx.arc(srcX, dy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        var flash = Math.abs(Math.sin(t * 9)) > 0.72;
        ctx.save();
        ctx.globalAlpha = flash ? 0.95 : 0.35;
        ctx.fillStyle = C.cyan;
        glowOn(ctx, C.cyan, 22);
        ctx.beginPath();
        ctx.arc(srcX, 122, flash ? 9 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        label(ctx, "Sn droplet", srcX, 34, C.text, 9, "center");
        label(ctx, "laser → plasma", srcX, 148, C.cyan, 9, "center");

        var mx2 = w * 0.46;
        wire(
          ctx,
          [
            [srcX + 12, 122],
            [mx2 - 40, 122],
          ],
          true,
          C.cyan
        );
        ctx.save();
        ctx.strokeStyle = C.cyan;
        ctx.lineWidth = 1.4;
        ctx.strokeRect(mx2 - 34, 76, 68, 92);
        ctx.restore();
        for (var m = 0; m < 6; m++) {
          if (m % 2 === 0) {
            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = C.cyan;
            ctx.fillRect(mx2 - 28, 84 + m * 14, 56, 8);
            ctx.restore();
          }
        }
        label(ctx, "mask", mx2, 62, C.cyan, 10, "center");

        var wx = w * 0.78;
        ctx.save();
        ctx.strokeStyle = C.on;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(wx - 70, 76, 140, 92);
        ctx.restore();
        var exposed = Math.min(1, (t % DUR) / (DUR * 0.75));
        for (var m2 = 0; m2 < 6; m2++) {
          if (m2 % 2 === 0 && (m2 + 1) / 6 <= exposed + 0.2) {
            ctx.save();
            ctx.globalAlpha = 0.75;
            ctx.fillStyle = C.on;
            glowOn(ctx, C.on, 8);
            ctx.fillRect(wx - 58, 84 + m2 * 14, 116, 8);
            ctx.restore();
          }
        }
        var beamX = mx2 + 34 + (wx - 70 - mx2 - 34) * (0.5 + 0.5 * Math.sin(t * 2));
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = C.cyan;
        ctx.fillRect(mx2 + 34, 76, beamX - mx2 - 34, 92);
        ctx.restore();
        label(ctx, "resist", wx, 62, C.on, 10, "center");
        label(ctx, "λ = 13.5 nm · prints features smaller than its own wavelength", cx, HH - 16, C.text, 10, "center");
      } else {
        var beam = Math.min(1, (t % DUR) / (DUR * 0.4));
        if (beam < 1) {
          for (var ib = 0; ib < 26; ib++) {
            var ix = cx - 120 + ib * 9;
            var iy = 40 + ((t * 220 + ib * 30) % 90);
            wire(
              ctx,
              [
                [ix, iy],
                [ix, iy + 10],
              ],
              true,
              C.magenta
            );
          }
          label(ctx, "B⁺ / P⁺ ion implantation", cx, 30, C.magenta, 11, "center");
        }
        var cols = 10,
          rows = 5,
          dw = Math.min(30, (w - 60) / cols),
          dh = 22;
        var ox = cx - (cols * dw) / 2,
          oy = cy - (rows * dh) / 2 + 22;
        var good = 0,
          total = cols * rows;
        for (var r2 = 0; r2 < rows; r2++) {
          for (var c2 = 0; c2 < cols; c2++) {
            var alive = (r2 * 7 + c2 * 3) % 11 !== 0;
            if (alive) good++;
            ctx.save();
            ctx.globalAlpha = alive ? 0.35 + 0.5 * Math.abs(Math.sin(t * 2 + r2 + c2)) : 0.5;
            ctx.strokeStyle = alive ? C.on : C.red;
            ctx.lineWidth = 1.1;
            ctx.strokeRect(ox + c2 * dw, oy + r2 * dh, dw - 4, dh - 4);
            ctx.restore();
          }
        }
        label(ctx, "yield " + Math.round((good / total) * 100) + "% — red dies are thrown away", cx, HH - 16, C.text, 10, "center");
      }

      label(ctx, FAB[st.i].k + " " + FAB[st.i].t, 14, 18, C.bright, 12, "left");
    }

    function refresh() {
      tabEls.forEach(function (b, idx) {
        b.setAttribute("aria-selected", idx === st.i ? "true" : "false");
        b.classList.toggle("is-on", idx === st.i);
      });
      cap.textContent = FAB[st.i].k + " — " + FAB[st.i].t + ". " + FAB[st.i].d;
      statWrap.textContent = "";
      FAB[st.i].stats.forEach(function (s) {
        statWrap.appendChild(
          h("div", { class: "al-stat" }, [h("span", { class: "al-stat-k", text: s[0] }), h("span", { class: "al-stat-v", text: s[1] })])
        );
      });
      draw();
    }

    addLoop(mount, function (dt) {
      if (RM) return;
      st.t += dt / 1000;
      bar.style.width = Math.min(100, (st.t / DUR) * 100) + "%";
      if (st.auto && st.t > DUR) {
        st.t = 0;
        st.i = (st.i + 1) % FAB.length;
        refresh();
        return;
      }
      draw();
    });
    onResize(mount, draw);
    onRepaint(draw);
    refresh();
  }

  /* ====================================================================== *
   * MODULE: mosfet — device physics and the CMOS inverter
   * ====================================================================== */

  var VDD = 1.8,
    VTH = 0.5,
    KP = 320; /* µA/V² */

  function mosCurrent(vov, vds) {
    if (vov <= 0) return 0;
    if (vds <= 0) return 0;
    return vds < vov ? KP * (vov * vds - (vds * vds) / 2) : (KP * vov * vov) / 2;
  }

  /* Solve the inverter's output for a given input by balancing the two
     currents. In rises with Vout, Ip falls with it, so bisection is safe. */
  function inverterVout(vin) {
    var lo = 0,
      hi = VDD;
    for (var i = 0; i < 44; i++) {
      var mid = (lo + hi) / 2;
      var iN = mosCurrent(vin - VTH, mid);
      var iP = mosCurrent(VDD - vin - VTH, VDD - mid);
      if (iN - iP < 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function initMosfet(mount) {
    var body = panel(mount, "MOSFET — THE SWITCH", "DRAG THE VOLTAGES");
    var cv = h("canvas", { class: "al-canvas", "aria-hidden": "true" });
    var st = { view: "Device", vg: 0, vd: 1.2, vin: 0, t: 0 };

    var tabRow = tabs(
      ["Device", "Inverter"],
      "Device",
      function (nm) {
        st.view = nm;
        tabRow.select(nm);
        buildControls();
        refresh();
      },
      "MOSFET view"
    );

    var ctlWrap = h("div", { class: "al-controls" });
    var sVg = statCell("V₉ₛ"),
      sVd = statCell("Vᴅₛ"),
      sReg = statCell("REGION"),
      sId = statCell("DRAIN CURRENT"),
      sOut = statCell("LOGIC OUT"),
      sGain = statCell("GAIN dVₒᵤₜ/dVᵢₙ");
    var statWrap = h("div", { class: "al-stats" });
    var live = h("p", { class: "al-live", role: "status", "aria-live": "polite" });
    var note = h("p", { class: "al-note" });

    function buildControls() {
      ctlWrap.textContent = "";
      statWrap.textContent = "";
      if (st.view === "Device") {
        var g = slider("Gate voltage in volts", 0, VDD, 0.01, st.vg, function (v) {
          st.vg = v;
          refresh();
        });
        var d = slider("Drain voltage in volts", 0, VDD, 0.01, st.vd, function (v) {
          st.vd = v;
          refresh();
        });
        ctlWrap.appendChild(h("label", { class: "al-ctl al-grow" }, [h("span", { text: "V₉ₛ" }), g]));
        ctlWrap.appendChild(h("label", { class: "al-ctl al-grow" }, [h("span", { text: "Vᴅₛ" }), d]));
        [sVg, sVd, sReg, sId, sOut].forEach(function (s) {
          statWrap.appendChild(s.el);
        });
      } else {
        var vi = slider("Input voltage in volts", 0, VDD, 0.005, st.vin, function (v) {
          st.vin = v;
          refresh();
        });
        ctlWrap.appendChild(h("label", { class: "al-ctl al-grow" }, [h("span", { text: "Vᵢₙ" }), vi]));
        ctlWrap.appendChild(
          btn("Snap to 0", "", function () {
            st.vin = 0;
            buildControls();
            refresh();
          })
        );
        ctlWrap.appendChild(
          btn("Snap to VDD", "", function () {
            st.vin = VDD;
            buildControls();
            refresh();
          })
        );
        [sVg, sReg, sOut, sGain].forEach(function (s) {
          statWrap.appendChild(s.el);
        });
      }
    }

    body.appendChild(tabRow);
    body.appendChild(canvasWrap(cv, "MOSFET cross section and characteristic curves"));
    body.appendChild(ctlWrap);
    body.appendChild(statWrap);
    body.appendChild(live);
    body.appendChild(note);

    function drawAxes(ctx, x0, y0, plotW, plotH, xMax, yMax, xLab, yLab) {
      ctx.save();
      ctx.strokeStyle = C.stroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, y0 - plotH);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x0 + plotW, y0);
      ctx.stroke();
      ctx.restore();
      for (var i = 0; i <= 3; i++) {
        var gx = x0 + (plotW * i) / 3;
        label(ctx, ((xMax * i) / 3).toFixed(1), gx, y0 + 11, C.text, 9, "center");
        var gy = y0 - (plotH * i) / 3;
        label(ctx, Math.round((yMax * i) / 3), x0 - 5, gy, C.text, 9, "right");
      }
      label(ctx, xLab, x0 + plotW, y0 + 22, C.text, 9, "right");
      label(ctx, yLab, x0 - 4, y0 - plotH - 10, C.text, 9, "left");
    }

    function drawDevice(ctx, w) {
      var vov = st.vg - VTH;
      var on = Math.max(0, Math.min(1, vov / 0.5));
      var L = Math.max(36, w * 0.08),
        R = w * 0.47;
      var subTop = 74;

      ctx.save();
      ctx.fillStyle = C.fillOff;
      ctx.fillRect(L, subTop, R - L, 76);
      ctx.strokeStyle = C.magenta;
      ctx.globalAlpha = 0.7;
      ctx.strokeRect(L, subTop, R - L, 76);
      ctx.restore();
      label(ctx, "p-type substrate", (L + R) / 2, subTop + 62, C.magenta, 9, "center");

      var swid = (R - L) * 0.24;
      [
        [L + 5, "SOURCE"],
        [R - swid - 5, "DRAIN"],
      ].forEach(function (p) {
        ctx.save();
        ctx.fillStyle = C.fillOn;
        ctx.fillRect(p[0], subTop, swid, 32);
        ctx.strokeStyle = C.cyan;
        ctx.strokeRect(p[0], subTop, swid, 32);
        ctx.restore();
        label(ctx, p[1] + " n+", p[0] + swid / 2, subTop + 16, C.cyan, 9, "center");
      });

      var chX = L + 5 + swid,
        chW = R - swid - 5 - chX;
      if (on > 0) {
        ctx.save();
        ctx.globalAlpha = on;
        ctx.fillStyle = C.on;
        glowOn(ctx, C.on, 16);
        ctx.fillRect(chX, subTop + 2, chW, 6);
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = C.magenta;
        ctx.strokeRect(chX, subTop + 2, chW, 14);
        ctx.restore();
      }
      label(ctx, on > 0 ? "inversion channel" : "depletion — no channel", chX + chW / 2, subTop + 26, on > 0 ? C.on : C.text, 9, "center");

      ctx.save();
      ctx.fillStyle = C.stroke;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(chX - 7, subTop - 11, chW + 14, 10);
      ctx.restore();
      label(ctx, "SiO₂", chX + chW / 2, subTop - 6, C.text, 8, "center");
      box(ctx, chX - 7, subTop - 30, chW + 14, 18, st.vg > VTH, C.amber);
      label(ctx, "GATE", chX + chW / 2, subTop - 21, st.vg > VTH ? C.amber : C.text, 9, "center");
      wire(
        ctx,
        [
          [chX + chW / 2, subTop - 30],
          [chX + chW / 2, 34],
        ],
        st.vg > 0.05,
        C.amber
      );
      label(ctx, "V₉ₛ " + st.vg.toFixed(2) + " V", chX + chW / 2, 24, st.vg > VTH ? C.amber : C.text, 10, "center");

      var id = mosCurrent(vov, st.vd);
      if (on > 0 && id > 1 && !RM) {
        var speed = Math.min(240, 40 + id * 0.4);
        for (var e = 0; e < 20; e++) {
          var px = chX + ((e * 17 + st.t * speed) % chW);
          ctx.save();
          ctx.globalAlpha = 0.45 + 0.5 * on;
          ctx.fillStyle = C.on;
          ctx.beginPath();
          ctx.arc(px, subTop + 5, 1.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      wire(
        ctx,
        [
          [R, subTop + 16],
          [R + 14, subTop + 16],
          [R + 14, 40],
        ],
        st.vd > 0.05,
        C.cyan
      );
      label(ctx, "Vᴅₛ " + st.vd.toFixed(2) + " V", R + 18, 34, C.cyan, 10, "left");

      /* characteristic curves */
      var x0 = w * 0.66,
        y0 = 190,
        plotW = w * 0.3,
        plotH = 140;
      var idMax = (KP * (VDD - VTH) * (VDD - VTH)) / 2;
      ctx.save();
      ctx.fillStyle = C.plot;
      ctx.fillRect(x0, y0 - plotH, plotW, plotH);
      ctx.restore();
      drawAxes(ctx, x0, y0, plotW, plotH, VDD, idMax, "Vᴅₛ (V)", "Iᴅ (µA)");

      /* saturation locus, Vds = Vgs - Vth */
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = C.magenta;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var q = 0; q <= 40; q++) {
        var vd2 = (VDD * q) / 40;
        var idl = (KP * vd2 * vd2) / 2;
        var px2 = x0 + (vd2 / VDD) * plotW,
          py2 = y0 - Math.min(1, idl / idMax) * plotH;
        if (q === 0) ctx.moveTo(px2, py2);
        else ctx.lineTo(px2, py2);
      }
      ctx.stroke();
      ctx.restore();
      label(ctx, "saturation ↑", x0 + plotW * 0.5, y0 - plotH + 12, C.magenta, 8, "center");

      [0.6, 0.9, 1.2, 1.5, 1.8].forEach(function (vg) {
        var active = Math.abs(vg - st.vg) < 0.16;
        ctx.save();
        ctx.strokeStyle = active ? C.on : C.stroke;
        ctx.lineWidth = active ? 2 : 1;
        if (active) glowOn(ctx, C.on, 8);
        ctx.beginPath();
        for (var q2 = 0; q2 <= 60; q2++) {
          var vd3 = (VDD * q2) / 60;
          var idc = mosCurrent(vg - VTH, vd3);
          var px3 = x0 + (vd3 / VDD) * plotW,
            py3 = y0 - Math.min(1, idc / idMax) * plotH;
          if (q2 === 0) ctx.moveTo(px3, py3);
          else ctx.lineTo(px3, py3);
        }
        ctx.stroke();
        ctx.restore();
        var idEnd = mosCurrent(vg - VTH, VDD);
        label(ctx, vg.toFixed(1), x0 + plotW + 3, y0 - Math.min(1, idEnd / idMax) * plotH, active ? C.on : C.text, 8, "left");
      });

      var opx = x0 + (st.vd / VDD) * plotW,
        opy = y0 - Math.min(1, id / idMax) * plotH;
      node(ctx, opx, opy, true, C.cyan);
      label(ctx, Math.round(id) + " µA", opx, opy - 12, C.cyan, 9, "center");
    }

    function drawInverter(ctx, w) {
      var vin = st.vin,
        vout = inverterVout(vin);
      var pOn = VDD - vin > VTH,
        nOn = vin > VTH;
      var cx = w * 0.24;

      wire(
        ctx,
        [
          [cx - 60, 40],
          [cx + 60, 40],
        ],
        true,
        C.amber
      );
      label(ctx, "VDD " + VDD.toFixed(1) + " V", cx + 64, 40, C.amber, 10, "left");
      wire(
        ctx,
        [
          [cx - 60, 236],
          [cx + 60, 236],
        ],
        true,
        C.text
      );
      label(ctx, "GND", cx + 64, 236, C.text, 10, "left");

      box(ctx, cx - 26, 66, 52, 40, pOn, C.amber);
      label(ctx, "pMOS", cx, 80, pOn ? C.amber : C.text, 9, "center");
      label(ctx, pOn ? "ON" : "off", cx, 94, pOn ? C.amber : C.text, 9, "center");
      box(ctx, cx - 26, 168, 52, 40, nOn, C.on);
      label(ctx, "nMOS", cx, 182, nOn ? C.on : C.text, 9, "center");
      label(ctx, nOn ? "ON" : "off", cx, 196, nOn ? C.on : C.text, 9, "center");

      wire(
        ctx,
        [
          [cx, 40],
          [cx, 66],
        ],
        pOn,
        C.amber
      );
      wire(
        ctx,
        [
          [cx, 106],
          [cx, 168],
        ],
        true,
        vout > VDD / 2 ? C.amber : C.on
      );
      wire(
        ctx,
        [
          [cx, 208],
          [cx, 236],
        ],
        nOn,
        C.on
      );
      wire(
        ctx,
        [
          [cx - 90, 137],
          [cx - 26, 137],
        ],
        vin > VTH,
        C.cyan
      );
      wire(
        ctx,
        [
          [cx - 70, 86],
          [cx - 70, 188],
        ],
        vin > VTH,
        C.cyan
      );
      wire(
        ctx,
        [
          [cx - 70, 86],
          [cx - 26, 86],
        ],
        vin > VTH,
        C.cyan
      );
      wire(
        ctx,
        [
          [cx - 70, 188],
          [cx - 26, 188],
        ],
        vin > VTH,
        C.cyan
      );
      label(ctx, "Vᵢₙ " + vin.toFixed(2), cx - 94, 137, C.cyan, 10, "right");
      wire(
        ctx,
        [
          [cx, 137],
          [cx + 78, 137],
        ],
        vout > VDD / 2,
        vout > VDD / 2 ? C.amber : C.on
      );
      node(ctx, cx, 137, true, vout > VDD / 2 ? C.amber : C.on);
      label(ctx, "Vₒᵤₜ " + vout.toFixed(2), cx + 82, 137, C.bright, 10, "left");

      var x0 = w * 0.6,
        y0 = 232,
        plotW = w * 0.34,
        plotH = 178;
      ctx.save();
      ctx.fillStyle = C.plot;
      ctx.fillRect(x0, y0 - plotH, plotW, plotH);
      ctx.restore();
      drawAxes(ctx, x0, y0, plotW, plotH, VDD, VDD, "Vᵢₙ (V)", "Vₒᵤₜ (V)");

      /* the transition band — where the inverter is an amplifier, not a switch */
      var loV = null,
        hiV = null;
      for (var s2 = 0; s2 <= 200; s2++) {
        var v1 = (VDD * s2) / 200,
          v2 = (VDD * (s2 + 1)) / 200;
        var slope = (inverterVout(v2) - inverterVout(v1)) / (v2 - v1);
        if (slope < -1 && loV === null) loV = v1;
        if (slope < -1) hiV = v2;
      }
      if (loV !== null) {
        ctx.save();
        ctx.fillStyle = C.red;
        ctx.globalAlpha = 0.12;
        ctx.fillRect(x0 + (loV / VDD) * plotW, y0 - plotH, ((hiV - loV) / VDD) * plotW, plotH);
        ctx.restore();
        label(ctx, "forbidden", x0 + ((loV + hiV) / 2 / VDD) * plotW, y0 - plotH + 10, C.red, 8, "center");
      }

      ctx.save();
      ctx.strokeStyle = C.on;
      ctx.lineWidth = 2;
      glowOn(ctx, C.on, 9);
      ctx.beginPath();
      for (var s3 = 0; s3 <= 120; s3++) {
        var vi3 = (VDD * s3) / 120,
          vo3 = inverterVout(vi3);
        var px = x0 + (vi3 / VDD) * plotW,
          py = y0 - (vo3 / VDD) * plotH;
        if (s3 === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
      var opx = x0 + (vin / VDD) * plotW,
        opy = y0 - (vout / VDD) * plotH;
      node(ctx, opx, opy, true, C.cyan);
      label(ctx, "voltage transfer characteristic", x0 + plotW / 2, y0 - plotH - 12, C.text, 9, "center");
    }

    function draw() {
      var HH = st.view === "Device" ? 240 : 268;
      var f = fit(cv, HH);
      var ctx = f.ctx,
        w = f.w;
      ctx.clearRect(0, 0, w, HH);
      grid(ctx, w, HH, 22);
      if (st.view === "Device") drawDevice(ctx, w);
      else drawInverter(ctx, w);
    }

    function refresh() {
      if (st.view === "Device") {
        var vov = st.vg - VTH;
        var id = mosCurrent(vov, st.vd);
        var region = vov <= 0 ? "CUT-OFF" : st.vd < vov ? "TRIODE (resistive)" : "SATURATION";
        sVg.v.textContent = st.vg.toFixed(2) + " V";
        sVd.v.textContent = st.vd.toFixed(2) + " V";
        sReg.v.textContent = region;
        sId.v.textContent = Math.round(id) + " µA";
        sOut.v.textContent = vov > 0 ? "1" : "0";
        sOut.v.classList.toggle("is-on", vov > 0);
        live.textContent =
          vov > 0
            ? "Gate at " +
              st.vg.toFixed(2) +
              " V is " +
              vov.toFixed(2) +
              " V above threshold: a channel has formed and " +
              Math.round(id) +
              " µA flows. Region: " +
              region +
              "."
            : "Gate at " + st.vg.toFixed(2) + " V is below the " + VTH + " V threshold. No channel, no current, logic 0.";
        note.textContent =
          "The dashed parabola is the saturation boundary Vᴅₛ = V₉ₛ − Vₜₕ. Left of it the device behaves like a resistor; right of it the current stops caring about the drain voltage. Digital logic lives at the two extreme corners of this plot and races through everything in between.";
      } else {
        var vout = inverterVout(st.vin);
        var slope = (inverterVout(Math.min(VDD, st.vin + 0.01)) - inverterVout(Math.max(0, st.vin - 0.01))) / 0.02;
        sVg.v.textContent = st.vin.toFixed(2) + " V";
        sReg.v.textContent = st.vin < 0.4 ? "pMOS pulls up" : st.vin > VDD - 0.4 ? "nMOS pulls down" : "both partly on";
        sOut.v.textContent = vout.toFixed(2) + " V → logic " + (vout > VDD / 2 ? "1" : "0");
        sOut.v.classList.toggle("is-on", vout > VDD / 2);
        sGain.v.textContent = slope.toFixed(1) + " ×";
        live.textContent =
          "Input " +
          st.vin.toFixed(2) +
          " V gives output " +
          vout.toFixed(2) +
          " V, gain " +
          slope.toFixed(1) +
          ". Logic level " +
          (vout > VDD / 2 ? "1" : "0") +
          ".";
        note.textContent =
          "Drag the input slowly through the middle. The output does not follow smoothly — it falls off a cliff, because the gain in that band is far greater than one. That cliff is the whole reason digital logic is possible: small input errors are squashed, not amplified. Everything above this layer depends on it.";
      }
      draw();
    }

    addLoop(mount, function (dt) {
      if (RM) return;
      st.t += dt / 1000;
      if (st.view === "Device" && st.vg > VTH) draw();
    });
    onResize(mount, draw);
    onRepaint(refresh);
    buildControls();
    refresh();
  }

  /* ====================================================================== *
   * MODULE: nand — functional completeness, gate and transistor level
   * ====================================================================== */

  var NAND_BUILD = {
    NAND: { n: [{ i: ["A", "B"], x: 0.5, y: 0.5 }], out: 0, ins: 2, expr: "A·B" },
    NOT: { n: [{ i: ["A", "A"], x: 0.5, y: 0.5 }], out: 0, ins: 1, expr: "A" },
    AND: {
      n: [
        { i: ["A", "B"], x: 0.38, y: 0.5 },
        { i: [0, 0], x: 0.68, y: 0.5 },
      ],
      out: 1,
      ins: 2,
      expr: "A·B",
    },
    OR: {
      n: [
        { i: ["A", "A"], x: 0.34, y: 0.26 },
        { i: ["B", "B"], x: 0.34, y: 0.74 },
        { i: [0, 1], x: 0.66, y: 0.5 },
      ],
      out: 2,
      ins: 2,
      expr: "A+B",
    },
    NOR: {
      n: [
        { i: ["A", "A"], x: 0.3, y: 0.26 },
        { i: ["B", "B"], x: 0.3, y: 0.74 },
        { i: [0, 1], x: 0.55, y: 0.5 },
        { i: [2, 2], x: 0.78, y: 0.5 },
      ],
      out: 3,
      ins: 2,
      expr: "A+B",
    },
    XOR: {
      n: [
        { i: ["A", "B"], x: 0.33, y: 0.5 },
        { i: ["A", 0], x: 0.56, y: 0.24 },
        { i: ["B", 0], x: 0.56, y: 0.76 },
        { i: [1, 2], x: 0.79, y: 0.5 },
      ],
      out: 3,
      ins: 2,
      expr: "A⊕B",
    },
  };

  function initNand(mount) {
    var body = panel(mount, "EVERY GATE FROM NAND ALONE", "NAND IS UNIVERSAL");
    var cv = h("canvas", { class: "al-canvas", "aria-hidden": "true" });
    var st = { kind: "XOR", view: "Gate level", a: 1, b: 0, settled: 99, running: false, t: 0 };
    var names = ["NOT", "AND", "OR", "NAND", "NOR", "XOR"];

    var gateTabs = tabs(
      names,
      st.kind,
      function (nm) {
        st.kind = nm;
        gateTabs.select(nm);
        st.settled = 99;
        refresh();
      },
      "Target gate"
    );

    var viewTabs = tabs(
      ["Gate level", "Transistor level"],
      st.view,
      function (nm) {
        st.view = nm;
        viewTabs.select(nm);
        refresh();
      },
      "Level of detail"
    );

    var ta = toggleBtn("Input A", true, function (v) {
      st.a = v;
      st.settled = st.running ? 0 : 99;
      refresh();
    });
    var tb = toggleBtn("Input B", false, function (v) {
      st.b = v;
      st.settled = st.running ? 0 : 99;
      refresh();
    });
    var inputs = h("div", { class: "al-bitrow" }, [
      h("span", { class: "al-bitlabel", text: "A" }),
      ta,
      h("span", { class: "al-bitlabel", text: "B" }),
      tb,
    ]);

    var pulseBtn = btn("Propagate ▶", "al-btn-go", function () {
      st.settled = 0;
      st.running = true;
      st.t = 0;
      refresh();
    });

    var ttBody = h("tbody");
    var tt = h("table", { class: "al-tt" }, [
      h("caption", { class: "al-tt-cap", text: "Truth table of the NAND-only construction" }),
      h("thead", {}, [
        h("tr", {}, [h("th", { scope: "col", text: "A" }), h("th", { scope: "col", text: "B" }), h("th", { scope: "col", text: "OUT" })]),
      ]),
      ttBody,
    ]);

    var sCount = statCell("NAND GATES"),
      sTrans = statCell("TRANSISTORS"),
      sDepth = statCell("GATE DELAYS"),
      sExpr = statCell("EXPRESSION");
    var statWrap = h("div", { class: "al-stats" }, [sCount.el, sTrans.el, sDepth.el, sExpr.el]);
    var live = h("p", { class: "al-live", role: "status", "aria-live": "polite" });
    var note = h("p", { class: "al-note" });

    body.appendChild(gateTabs);
    body.appendChild(viewTabs);
    body.appendChild(inputs);
    body.appendChild(canvasWrap(cv, "NAND-only gate construction"));
    body.appendChild(h("div", { class: "al-controls" }, [pulseBtn]));
    body.appendChild(statWrap);
    body.appendChild(live);
    body.appendChild(note);
    body.appendChild(tt);

    function evaluate(build, a, b) {
      var vals = [];
      build.n.forEach(function (nd, idx) {
        var src = function (ref) {
          return ref === "A" ? a : ref === "B" ? b : vals[ref];
        };
        vals[idx] = (src(nd.i[0]) & src(nd.i[1])) ^ 1;
      });
      return vals;
    }

    function depths(build) {
      var d = [];
      build.n.forEach(function (nd, idx) {
        var m = 0;
        nd.i.forEach(function (ref) {
          if (typeof ref === "number") m = Math.max(m, d[ref]);
        });
        d[idx] = m + 1;
      });
      return d;
    }

    function drawGateLevel(ctx, w, HH) {
      var build = NAND_BUILD[st.kind];
      var vals = evaluate(build, st.a, st.b);
      var dep = depths(build);
      var gw = Math.min(58, w * 0.11),
        gh = 30;
      var inX = Math.max(34, w * 0.07);
      var yA = HH * 0.3,
        yB = HH * 0.7;

      label(ctx, st.kind + "  from  " + build.n.length + " × NAND", w / 2, 16, C.cyan, 12, "center");
      label(ctx, "A=" + st.a, inX - 8, yA, st.a ? C.on : C.text, 12, "right");
      if (build.ins > 1) label(ctx, "B=" + st.b, inX - 8, yB, st.b ? C.on : C.text, 12, "right");

      var pos = build.n.map(function (nd) {
        return { x: nd.x * w - gw / 2, y: nd.y * HH - gh / 2 };
      });
      var pin = function (ref) {
        if (ref === "A") return [inX, yA];
        if (ref === "B") return [inX, yB];
        return [pos[ref].x + gw, pos[ref].y + gh / 2];
      };
      var known = function (ref) {
        return typeof ref === "number" ? dep[ref] <= st.settled : true;
      };
      var val = function (ref) {
        return ref === "A" ? st.a : ref === "B" ? st.b : vals[ref];
      };

      build.n.forEach(function (nd, idx) {
        nd.i.forEach(function (ref, side) {
          var from = pin(ref);
          var to = [pos[idx].x, pos[idx].y + gh * (side === 0 ? 0.28 : 0.72)];
          var midX = (from[0] + to[0]) / 2 - side * 5;
          wire(ctx, [from, [midX, from[1]], [midX, to[1]], to], known(ref) && val(ref) === 1, C.on);
        });
      });
      build.n.forEach(function (nd, idx) {
        var lit = dep[idx] <= st.settled && vals[idx];
        gate(ctx, "NAND", pos[idx].x, pos[idx].y, gw, gh, lit);
        if (dep[idx] > st.settled) label(ctx, "?", pos[idx].x + gw + 8, pos[idx].y + gh / 2, C.text, 11, "left");
        if (st.running && dep[idx] === st.settled) {
          ctx.save();
          ctx.strokeStyle = C.amber;
          ctx.lineWidth = 2;
          glowOn(ctx, C.amber, 14);
          ctx.strokeRect(pos[idx].x - 4, pos[idx].y - 4, gw + 8, gh + 8);
          ctx.restore();
        }
      });

      var outKnown = dep[build.out] <= st.settled;
      var outPin = [pos[build.out].x + gw, pos[build.out].y + gh / 2];
      wire(ctx, [outPin, [w - 56, outPin[1]]], outKnown && vals[build.out] === 1, C.on);
      label(ctx, "OUT " + (outKnown ? vals[build.out] : "?"), w - 52, outPin[1], outKnown && vals[build.out] ? C.on : C.text, 13, "left");
    }

    function drawTransistorLevel(ctx, w, HH) {
      /* the CMOS NAND primitive: two pMOS in parallel, two nMOS in series */
      var a = st.a,
        b = st.b;
      var pullUp = a === 0 || b === 0;
      var pullDown = a === 1 && b === 1;
      var out = pullDown ? 0 : 1;
      var cx = w * 0.42;

      label(ctx, "CMOS NAND — 4 transistors", w / 2, 16, C.cyan, 12, "center");
      wire(
        ctx,
        [
          [cx - 110, 44],
          [cx + 110, 44],
        ],
        true,
        C.amber
      );
      label(ctx, "VDD", cx + 116, 44, C.amber, 10, "left");
      wire(
        ctx,
        [
          [cx - 110, HH - 32],
          [cx + 110, HH - 32],
        ],
        true,
        C.text
      );
      label(ctx, "GND", cx + 116, HH - 32, C.text, 10, "left");

      /* pMOS pair, in parallel */
      var pA = a === 0,
        pB = b === 0;
      box(ctx, cx - 92, 66, 60, 30, pA, C.amber);
      label(ctx, "pMOS A", cx - 62, 81, pA ? C.amber : C.text, 9, "center");
      box(ctx, cx + 32, 66, 60, 30, pB, C.amber);
      label(ctx, "pMOS B", cx + 62, 81, pB ? C.amber : C.text, 9, "center");
      wire(
        ctx,
        [
          [cx - 62, 44],
          [cx - 62, 66],
        ],
        pA,
        C.amber
      );
      wire(
        ctx,
        [
          [cx + 62, 44],
          [cx + 62, 66],
        ],
        pB,
        C.amber
      );
      wire(
        ctx,
        [
          [cx - 62, 96],
          [cx - 62, 118],
          [cx + 62, 118],
          [cx + 62, 96],
        ],
        pullUp,
        C.amber
      );

      /* nMOS pair, in series */
      var nA = a === 1,
        nB = b === 1;
      box(ctx, cx - 30, 150, 60, 30, nA, C.on);
      label(ctx, "nMOS A", cx, 165, nA ? C.on : C.text, 9, "center");
      box(ctx, cx - 30, 200, 60, 30, nB, C.on);
      label(ctx, "nMOS B", cx, 215, nB ? C.on : C.text, 9, "center");
      wire(
        ctx,
        [
          [cx, 118],
          [cx, 150],
        ],
        pullDown,
        C.on
      );
      wire(
        ctx,
        [
          [cx, 180],
          [cx, 200],
        ],
        pullDown,
        C.on
      );
      wire(
        ctx,
        [
          [cx, 230],
          [cx, HH - 32],
        ],
        pullDown,
        C.on
      );

      /* gate wiring from the two inputs */
      wire(
        ctx,
        [
          [cx - 170, 100],
          [cx - 130, 100],
          [cx - 130, 81],
          [cx - 92, 81],
        ],
        a === 1,
        C.cyan
      );
      wire(
        ctx,
        [
          [cx - 130, 100],
          [cx - 130, 165],
          [cx - 30, 165],
        ],
        a === 1,
        C.cyan
      );
      label(ctx, "A=" + a, cx - 174, 100, a ? C.cyan : C.text, 11, "right");
      wire(
        ctx,
        [
          [cx - 170, 215],
          [cx - 150, 215],
          [cx - 150, 81],
          [cx + 32, 81],
        ],
        b === 1,
        C.cyan
      );
      wire(
        ctx,
        [
          [cx - 150, 215],
          [cx - 30, 215],
        ],
        b === 1,
        C.cyan
      );
      label(ctx, "B=" + b, cx - 174, 215, b ? C.cyan : C.text, 11, "right");

      node(ctx, cx, 118, true, out ? C.amber : C.on);
      wire(
        ctx,
        [
          [cx, 118],
          [cx + 150, 118],
        ],
        out === 1,
        C.amber
      );
      label(ctx, "OUT " + out, cx + 156, 118, out ? C.amber : C.text, 13, "left");
      label(
        ctx,
        pullUp ? "pull-up conducts → output is pulled to VDD" : "both nMOS conduct in series → output is pulled to GND",
        w / 2,
        HH - 10,
        pullUp ? C.amber : C.on,
        10,
        "center"
      );
    }

    function draw() {
      var HH = st.view === "Gate level" ? 220 : 268;
      var f = fit(cv, HH);
      var ctx = f.ctx,
        w = f.w;
      ctx.clearRect(0, 0, w, HH);
      grid(ctx, w, HH, 22);
      if (st.view === "Gate level") drawGateLevel(ctx, w, HH);
      else drawTransistorLevel(ctx, w, HH);
    }

    function refresh() {
      var build = NAND_BUILD[st.kind];
      tb.disabled = build.ins < 2;

      ttBody.textContent = "";
      var rows =
        build.ins === 1
          ? [
              [0, 0],
              [1, 0],
            ]
          : [
              [0, 0],
              [0, 1],
              [1, 0],
              [1, 1],
            ];
      rows.forEach(function (rw) {
        var v = evaluate(build, rw[0], rw[1])[build.out];
        var tr = h("tr", {}, [
          h("td", { text: String(rw[0]) }),
          h("td", { text: build.ins === 1 ? "—" : String(rw[1]) }),
          h("td", { text: String(v) }),
        ]);
        if (rw[0] === st.a && (build.ins === 1 || rw[1] === st.b)) tr.classList.add("is-active");
        ttBody.appendChild(tr);
      });

      var dep = depths(build);
      var maxDepth = Math.max.apply(null, dep);
      sCount.v.textContent = String(build.n.length);
      sTrans.v.textContent = build.n.length * 4 + " in CMOS";
      sDepth.v.textContent = maxDepth + " deep";
      sExpr.v.textContent = build.expr;

      var out = evaluate(build, st.a, st.b)[build.out];
      live.textContent =
        st.view === "Gate level"
          ? st.kind +
            "(" +
            st.a +
            (build.ins > 1 ? ", " + st.b : "") +
            ") = " +
            out +
            ", built from " +
            build.n.length +
            " NAND gates, " +
            maxDepth +
            " levels deep."
          : "CMOS NAND with A=" +
            st.a +
            ", B=" +
            st.b +
            " outputs " +
            (st.a === 1 && st.b === 1 ? 0 : 1) +
            ". Four transistors: two pulling up in parallel, two pulling down in series.";
      note.textContent =
        st.view === "Gate level"
          ? "Press Propagate to watch the signal arrive level by level. The output is not merely late — until the last level settles it is actively wrong, which is exactly why a clock exists."
          : "The pull-up network is the logical complement of the pull-down network. That duality is why CMOS never has a path from VDD to GND in a settled state, and therefore burns almost no power when it is not switching.";
      draw();
    }

    addLoop(mount, function (dt) {
      if (RM) {
        if (st.settled < 99) {
          st.settled = 99;
          refresh();
        }
        return;
      }
      if (!st.running) return;
      st.t += dt / 1000;
      if (st.t > 0.55) {
        st.t = 0;
        st.settled++;
        var maxD = Math.max.apply(null, depths(NAND_BUILD[st.kind]));
        if (st.settled >= maxD) {
          st.settled = 99;
          st.running = false;
        }
        refresh();
      }
    });
    onResize(mount, draw);
    onRepaint(refresh);
    refresh();
  }

  /* ====================================================================== *
   * MODULE: latch — SR, gated D, and a real edge-triggered flip-flop
   * ====================================================================== */

  var LATCH_MODES = {
    "SR latch": {
      inputs: [
        { k: "S", label: "S̄" },
        { k: "R", label: "R̄" },
      ],
      init: { S: 1, R: 1 },
      nodes: [
        { ins: ["S", 1], x: 0.55, y: 0.26, n: "Q" },
        { ins: ["R", 0], x: 0.55, y: 0.72, n: "Q'" },
      ],
      q: 0,
      qbar: 1,
      forbidden: function (v) {
        return v.S === 0 && v.R === 0;
      },
      note: "Active-low inputs. Pull S̄ low to set, R̄ low to reset, and leave both high to hold. Pull both low at once and the latch enters the forbidden state — both outputs go high, and releasing them together leaves the circuit genuinely undecided.",
    },
    "Gated D latch": {
      inputs: [
        { k: "D", label: "D" },
        { k: "EN", label: "EN" },
      ],
      init: { D: 1, EN: 0 },
      nodes: [
        { ins: ["D", "EN"], x: 0.26, y: 0.26, n: "N1" },
        { ins: [0, "EN"], x: 0.26, y: 0.72, n: "N2" },
        { ins: [0, 3], x: 0.62, y: 0.26, n: "Q" },
        { ins: [1, 2], x: 0.62, y: 0.72, n: "Q'" },
      ],
      q: 2,
      qbar: 3,
      clock: "EN",
      note: "While EN is high, Q tracks D continuously — including any glitch on D. While EN is low, the cross-coupled pair holds. This is level-triggered, which is why real registers use the flip-flop below instead.",
    },
    "Edge D flip-flop": {
      inputs: [
        { k: "D", label: "D" },
        { k: "CLK", label: "CLK" },
      ],
      init: { D: 1, CLK: 0 },
      nodes: [
        { ins: [3, 1], x: 0.16, y: 0.3, n: "N1" },
        { ins: [0, "CLK"], x: 0.36, y: 0.16, n: "N2" },
        { ins: [1, "CLK", 3], x: 0.36, y: 0.82, n: "N3" },
        { ins: [2, "D"], x: 0.16, y: 0.72, n: "N4" },
        { ins: [1, 5], x: 0.68, y: 0.26, n: "Q" },
        { ins: [2, 4], x: 0.68, y: 0.72, n: "Q'" },
      ],
      q: 4,
      qbar: 5,
      clock: "CLK",
      note: "Six NANDs. Q changes only on the rising edge of CLK — hold the clock high and hammer D, and nothing moves. This is the component every register in every CPU is made of.",
    },
  };

  function makeLatch(mode) {
    var def = LATCH_MODES[mode];
    var vals = def.nodes.map(function () {
      return 1;
    });
    vals[def.qbar] = 0;
    return { def: def, vals: vals, inputs: JSON.parse(JSON.stringify(def.init)), stable: true };
  }

  function latchStep(inst) {
    var def = inst.def;
    var res = settleUnitDelay(inst.vals.slice(), function (state) {
      return def.nodes.map(function (nd) {
        var all = 1;
        nd.ins.forEach(function (ref) {
          var v = typeof ref === "number" ? state[ref] : inst.inputs[ref];
          all &= v;
        });
        return all ^ 1;
      });
    });
    inst.vals = res.state;
    inst.stable = res.stable;
    return res;
  }

  function initLatch(mount) {
    var body = panel(mount, "MEMORY — A LOOP THAT HOLDS ITS OWN VALUE", "3 CIRCUITS");
    var cv = h("canvas", { class: "al-canvas", "aria-hidden": "true" });
    var modeNames = Object.keys(LATCH_MODES);
    var st = { mode: "Edge D flip-flop", inst: null, running: !RM, t: 0, tick: 0, hist: [], period: 0.9 };
    st.inst = makeLatch(st.mode);

    var modeTabs = tabs(
      modeNames,
      st.mode,
      function (nm) {
        st.mode = nm;
        st.inst = makeLatch(nm);
        st.hist = [];
        modeTabs.select(nm);
        buildInputs();
        refresh();
      },
      "Circuit"
    );

    var inputRow = h("div", { class: "al-bitrow" });
    var inputBtns = {};

    function buildInputs() {
      inputRow.textContent = "";
      inputBtns = {};
      st.inst.def.inputs.forEach(function (inp) {
        inputRow.appendChild(h("span", { class: "al-bitlabel", text: inp.label }));
        var b = toggleBtn(
          "Input " + inp.label,
          st.inst.inputs[inp.k],
          function (v) {
            st.inst.inputs[inp.k] = v;
            if (st.inst.def.clock === inp.k) {
              st.running = false;
              runBtn.textContent = "Run clock ▶";
            }
            refresh();
          },
          st.inst.def.clock === inp.k ? "al-bit-c" : ""
        );
        inputBtns[inp.k] = b;
        inputRow.appendChild(b);
      });
      inputRow.appendChild(h("span", { class: "al-bitlabel", text: "Q" }));
      inputRow.appendChild(qRead);
    }

    var qRead = h("span", { class: "al-stat-v al-big", text: "0" });
    var runBtn = btn(RM ? "Run clock ▶" : "Stop clock ⏸", "al-btn-go", function () {
      st.running = !st.running;
      runBtn.textContent = st.running ? "Stop clock ⏸" : "Run clock ▶";
    });
    var edgeBtn = btn("Clock ▲ once", "", function () {
      var ck = st.inst.def.clock;
      if (!ck) return;
      st.running = false;
      runBtn.textContent = "Run clock ▶";
      st.inst.inputs[ck] = 0;
      latchStep(st.inst);
      st.inst.inputs[ck] = 1;
      latchStep(st.inst);
      if (inputBtns[ck]) inputBtns[ck].set(1);
      refresh();
    });

    var sState = statCell("STATE"),
      sQ = statCell("Q / Q̄"),
      sSteps = statCell("SETTLING"),
      sGates = statCell("GATES");
    var statWrap = h("div", { class: "al-stats" }, [sState.el, sQ.el, sSteps.el, sGates.el]);
    var live = h("p", { class: "al-live", role: "status", "aria-live": "polite" });
    var note = h("p", { class: "al-note" });

    /* an 8-bit register: eight of the same flip-flop sharing one clock */
    var regD = [],
      regQ = [],
      regInsts = [];
    var regDRow = h("div", { class: "al-bitrow" }, [h("span", { class: "al-bitlabel", text: "D" })]);
    var regQRow = h("div", { class: "al-bitrow" }, [h("span", { class: "al-bitlabel", text: "Q" })]);
    for (var ri = 7; ri >= 0; ri--) {
      (function (idx) {
        var inst = makeLatch("Edge D flip-flop");
        inst.inputs.D = (75 >> idx) & 1;
        inst.inputs.CLK = 0;
        latchStep(inst);
        regInsts[idx] = inst;
        var b = toggleBtn("Register data bit " + idx, inst.inputs.D, function (v) {
          inst.inputs.D = v;
          refreshReg();
        });
        regD[idx] = b;
        regDRow.appendChild(b);
        var q = h("span", { class: "al-bit al-bit-ro", text: "0" });
        regQ[idx] = q;
        regQRow.appendChild(q);
      })(ri);
    }
    var regRead = h("span", { class: "al-bitread" });
    regQRow.appendChild(regRead);
    var regClock = btn("Clock ▲", "al-btn-go", function () {
      regInsts.forEach(function (inst) {
        inst.inputs.CLK = 0;
        latchStep(inst);
        inst.inputs.CLK = 1;
        latchStep(inst);
      });
      refreshReg();
    });
    var regLive = h("p", { class: "al-live", role: "status", "aria-live": "polite" });

    body.appendChild(modeTabs);
    body.appendChild(inputRow);
    body.appendChild(canvasWrap(cv, "Latch schematic and waveforms"));
    body.appendChild(h("div", { class: "al-controls" }, [runBtn, edgeBtn]));
    body.appendChild(statWrap);
    body.appendChild(live);
    body.appendChild(note);
    body.appendChild(h("hr", { class: "al-hr" }));
    body.appendChild(
      h("p", {
        class: "al-cap",
        text: "Eight of those flip-flops side by side, sharing one clock line, is a register. Set the D bits, then press Clock — the byte only moves on the edge.",
      })
    );
    body.appendChild(regDRow);
    body.appendChild(h("div", { class: "al-controls" }, [regClock]));
    body.appendChild(regQRow);
    body.appendChild(regLive);

    function refreshReg() {
      var bits = [];
      for (var i = 0; i < 8; i++) {
        var q = regInsts[i].vals[regInsts[i].def.q];
        bits[i] = q;
        regQ[i].textContent = String(q);
        regQ[i].classList.toggle("is-on", !!q);
      }
      var dv = 0,
        qv = bits2num(bits);
      for (var j = 7; j >= 0; j--) dv = dv * 2 + regInsts[j].inputs.D;
      regRead.textContent = "= " + qv;
      regLive.textContent =
        "Register input D is " +
        dv +
        " (" +
        bin8(dv) +
        "), stored output Q is " +
        qv +
        " (" +
        bin8(qv) +
        "). " +
        (dv === qv ? "They match — the last clock edge captured this value." : "They differ, and will keep differing until you press Clock.");
    }

    function draw() {
      var HH = 302;
      var f = fit(cv, HH);
      var ctx = f.ctx,
        w = f.w;
      ctx.clearRect(0, 0, w, HH);
      grid(ctx, w, HH, 22);

      var def = st.inst.def,
        vals = st.inst.vals;
      var gw = Math.min(54, w * 0.1),
        gh = 28;
      var schemH = 210;
      var inX = Math.max(40, w * 0.06);

      def.inputs.forEach(function (inp, ii) {
        var y = 50 + ii * 80;
        label(
          ctx,
          inp.label + "=" + st.inst.inputs[inp.k],
          inX - 8,
          y,
          st.inst.inputs[inp.k] ? (def.clock === inp.k ? C.amber : C.on) : C.text,
          11,
          "right"
        );
      });

      var pos = def.nodes.map(function (nd) {
        return { x: nd.x * (w - 90) + 50 - gw / 2, y: nd.y * (schemH - 80) + 30 - gh / 2 };
      });
      var pinOf = function (ref) {
        if (typeof ref === "number") return [pos[ref].x + gw, pos[ref].y + gh / 2];
        var ii = 0;
        def.inputs.forEach(function (inp, k) {
          if (inp.k === ref) ii = k;
        });
        return [inX, 50 + ii * 80];
      };
      var valOf = function (ref) {
        return typeof ref === "number" ? vals[ref] : st.inst.inputs[ref];
      };

      var lane = 0;
      def.nodes.forEach(function (nd, idx) {
        nd.ins.forEach(function (ref, side) {
          var from = pinOf(ref);
          var frac = nd.ins.length === 3 ? 0.2 + side * 0.3 : side === 0 ? 0.28 : 0.72;
          var to = [pos[idx].x, pos[idx].y + gh * frac];
          var feedback = typeof ref === "number" && ref >= idx;
          var color = feedback ? C.cyan : typeof ref === "string" && def.clock === ref ? C.amber : C.on;
          if (feedback) {
            /* run every feedback path along its own horizontal lane under the
               gates, so loops read as a bus instead of boxing in the schematic */
            var ly = schemH - 14 - lane * 6;
            var ax = from[0] + 10 + lane * 4;
            var bx = to[0] - 12 - lane * 3;
            lane++;
            wire(ctx, [from, [ax, from[1]], [ax, ly], [bx, ly], [bx, to[1]], to], valOf(ref) === 1, color);
          } else {
            var midX = (from[0] + to[0]) / 2 - side * 6;
            wire(ctx, [from, [midX, from[1]], [midX, to[1]], to], valOf(ref) === 1, color);
          }
        });
      });
      def.nodes.forEach(function (nd, idx) {
        gate(ctx, "NAND", pos[idx].x, pos[idx].y, gw, gh, vals[idx]);
        label(ctx, nd.n, pos[idx].x + gw / 2, pos[idx].y - 8, C.text, 8, "center");
      });

      label(ctx, "Q = " + vals[def.q], w - 10, pos[def.q].y + gh / 2, vals[def.q] ? C.on : C.text, 13, "right");
      label(ctx, "Q' = " + vals[def.qbar], w - 10, pos[def.qbar].y + gh / 2, vals[def.qbar] ? C.on : C.text, 11, "right");
      if (!st.inst.stable) {
        label(ctx, "UNSTABLE — oscillating", w / 2, 12, C.red, 11, "center");
      }

      /* waveforms */
      var traces = def.inputs
        .map(function (inp) {
          return inp.label;
        })
        .concat(["Q"]);
      var wy = schemH + 14,
        wh = 16,
        gap = 24;
      traces.forEach(function (nm, row) {
        var base = wy + row * gap;
        label(ctx, nm, 12, base + wh / 2, C.text, 9, "left");
        ctx.save();
        ctx.strokeStyle = row === traces.length - 1 ? C.cyan : def.clock === def.inputs[row].k ? C.amber : C.on;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        var x0 = 42,
          span = w - 56;
        for (var i = 0; i < st.hist.length; i++) {
          var v = st.hist[i][row];
          var px = x0 + (i / Math.max(1, st.hist.length - 1)) * span;
          var py = base + wh - v * wh;
          if (i === 0) ctx.moveTo(px, py);
          else {
            var pv = st.hist[i - 1][row];
            if (pv !== v) ctx.lineTo(px, base + wh - pv * wh);
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
        ctx.restore();
      });
    }

    function refresh() {
      var res = latchStep(st.inst);
      var def = st.inst.def,
        vals = st.inst.vals;
      var q = vals[def.q];
      qRead.textContent = String(q);
      qRead.classList.toggle("is-on", !!q);

      var forbidden = def.forbidden && def.forbidden(st.inst.inputs);
      var open = def.clock ? st.inst.inputs[def.clock] === 1 : false;
      sState.v.textContent = forbidden
        ? "FORBIDDEN"
        : !st.inst.stable
          ? "UNDEFINED"
          : def.clock
            ? st.mode === "Gated D latch"
              ? open
                ? "TRACKING D"
                : "HOLDING"
              : open
                ? "HOLDING (clock high)"
                : "HOLDING (clock low)"
            : "HOLDING";
      sState.el.classList.toggle("is-alert", forbidden || !st.inst.stable);
      sQ.v.textContent = vals[def.q] + " / " + vals[def.qbar];
      sSteps.v.textContent = st.inst.stable ? res.steps + " gate delay" + (res.steps === 1 ? "" : "s") : "never settles";
      sGates.v.textContent = def.nodes.length + " NAND";

      live.textContent = !st.inst.stable
        ? "The loop is oscillating: with these inputs the circuit has no stable state, so the stored value is genuinely undefined. Real hardware resolves this by luck and asymmetry, which is what metastability means."
        : forbidden
          ? "Both inputs are asserted at once. Q and Q̄ are both " +
            vals[def.q] +
            " — they are supposed to be opposites. Release them one at a time to get a defined result."
          : "Q = " +
            q +
            ", held by the feedback loop. " +
            (def.clock
              ? open && st.mode === "Gated D latch"
                ? "EN is high, so Q is following D."
                : "The stored value is independent of D right now."
              : "");
      note.textContent = def.note;
      if (!st.hist.length) {
        var seed = def.inputs
          .map(function (inp) {
            return st.inst.inputs[inp.k];
          })
          .concat([q]);
        for (var s2 = 0; s2 < 60; s2++) st.hist.push(seed);
      }
      draw();
    }

    addLoop(mount, function (dt) {
      if (RM) return;
      st.t += dt / 1000;
      var ck = st.inst.def.clock;
      if (st.running && ck && st.t - st.tick > st.period / 2) {
        st.tick = st.t;
        st.inst.inputs[ck] = st.inst.inputs[ck] ? 0 : 1;
        if (inputBtns[ck]) inputBtns[ck].set(st.inst.inputs[ck]);
        refresh();
      }
      latchStep(st.inst);
      var frame = st.inst.def.inputs
        .map(function (inp) {
          return st.inst.inputs[inp.k];
        })
        .concat([st.inst.vals[st.inst.def.q]]);
      st.hist.push(frame);
      if (st.hist.length > 240) st.hist.shift();
      draw();
    });
    onResize(mount, draw);
    onRepaint(refresh);
    buildInputs();
    refresh();
    regInsts.forEach(function (inst) {
      inst.inputs.CLK = 1;
      latchStep(inst);
    });
    refreshReg();
  }

  /* ====================================================================== *
   * MODULE: cpu — a toy von Neumann machine with a real assembler
   * ====================================================================== */

  var OPCODES = { NOP: 0x0, LDA: 0x1, ADD: 0x2, SUB: 0x3, STA: 0x4, JMP: 0x5, JZ: 0x6, OUT: 0xe, HLT: 0xf };
  var OPNAMES = {};
  Object.keys(OPCODES).forEach(function (k) {
    OPNAMES[OPCODES[k]] = k;
  });
  var NEEDS_ARG = { LDA: 1, ADD: 1, SUB: 1, STA: 1, JMP: 1, JZ: 1 };

  var CPU_PROGRAMS = {
    "Add 75 + 54": [
      "; the same sum the adder above performs,",
      "; this time as a stored program",
      "        LDA x",
      "        ADD y",
      "        STA sum",
      "        OUT",
      "        HLT",
      "        ORG 13",
      "sum:    DB 0",
      "x:      DB 75",
      "y:      DB 54",
    ].join("\n"),
    "Count down": [
      "; a loop — the machine decides where to go next",
      "        LDA n",
      "loop:   SUB one",
      "        OUT",
      "        JZ  done",
      "        STA n",
      "        JMP loop",
      "done:   HLT",
      "        ORG 14",
      "one:    DB 1",
      "n:      DB 5",
    ].join("\n"),
    "Multiply 6 × 7": [
      "; no multiply instruction exists,",
      "; so multiplication is a loop over addition",
      "        LDA cnt",
      "loop:   JZ  done",
      "        SUB one",
      "        STA cnt",
      "        LDA res",
      "        ADD val",
      "        STA res",
      "        LDA cnt",
      "        JMP loop",
      "done:   LDA res",
      "        OUT",
      "        HLT",
      "        ORG 12",
      "one:    DB 1",
      "cnt:    DB 6",
      "val:    DB 7",
      "res:    DB 0",
    ].join("\n"),
  };

  /* Two-pass assembler. Pass one fixes label addresses, pass two emits bytes. */
  function assemble(src) {
    var lines = src.split("\n");
    var labels = {},
      errors = [],
      items = [];
    var pc = 0;

    lines.forEach(function (raw, ln) {
      var line = raw.replace(/;.*$/, "").trim();
      if (!line) return;
      var m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*/);
      if (m) {
        if (labels[m[1]] !== undefined) errors.push("line " + (ln + 1) + ": duplicate label “" + m[1] + "”");
        labels[m[1]] = pc;
        line = line.slice(m[0].length).trim();
        if (!line) return;
      }
      var parts = line.split(/\s+/);
      var op = parts[0].toUpperCase();
      if (op === "ORG") {
        var target = parseVal(parts[1], {}, true);
        if (target === null || target < 0 || target > 15) errors.push("line " + (ln + 1) + ": ORG needs an address 0–15");
        else pc = target;
        return;
      }
      if (pc > 15) {
        errors.push("line " + (ln + 1) + ": ran past the end of a 16-byte memory");
        return;
      }
      items.push({ ln: ln + 1, op: op, arg: parts[1], addr: pc });
      pc++;
    });

    var ram = [];
    for (var i = 0; i < 16; i++) ram[i] = 0;

    items.forEach(function (it) {
      if (it.op === "DB") {
        var v = parseVal(it.arg, labels, true);
        if (v === null || v < 0 || v > 255) errors.push("line " + it.ln + ": DB needs a value 0–255");
        else ram[it.addr] = v;
        return;
      }
      if (OPCODES[it.op] === undefined) {
        errors.push("line " + it.ln + ": unknown instruction “" + it.op + "”");
        return;
      }
      var code = OPCODES[it.op] << 4;
      if (NEEDS_ARG[it.op]) {
        var a = parseVal(it.arg, labels, false);
        if (a === null) errors.push("line " + it.ln + ": " + it.op + " needs an address or a label");
        else if (a < 0 || a > 15) errors.push("line " + it.ln + ": address " + a + " is outside 0–15");
        else code |= a;
      } else if (it.arg) {
        errors.push("line " + it.ln + ": " + it.op + " takes no operand");
      }
      ram[it.addr] = code;
    });

    return { ram: ram, labels: labels, errors: errors, items: items };
  }

  function parseVal(tok, labels, allowByte) {
    if (tok === undefined || tok === null || tok === "") return null;
    if (labels && labels[tok] !== undefined) return labels[tok];
    var t = String(tok).trim();
    if (/^\$[0-9a-fA-F]+$/.test(t)) return parseInt(t.slice(1), 16);
    if (/^0[xX][0-9a-fA-F]+$/.test(t)) return parseInt(t.slice(2), 16);
    if (/^-?\d+$/.test(t)) {
      var n = parseInt(t, 10);
      return allowByte && n < 0 ? (n + 256) & 0xff : n;
    }
    return null;
  }

  function initCpu(mount) {
    var body = panel(mount, "TOY VON NEUMANN MACHINE — 16 BYTES, 9 OPCODES", "ASSEMBLER INSIDE");

    var st = {
      ram: [],
      pc: 0,
      mar: 0,
      ir: 0,
      acc: 0,
      out: [],
      z: 0,
      phase: 0,
      halted: false,
      running: false,
      t: 0,
      speed: 1,
      labels: {},
      program: "Add 75 + 54",
    };

    var cv = h("canvas", { class: "al-canvas", "aria-hidden": "true" });
    var src = h("textarea", {
      class: "al-src",
      spellcheck: "false",
      rows: "12",
      "aria-label": "Assembly source code",
      oninput: function () {
        errEl.textContent = "Press Assemble to load this into memory.";
        errEl.className = "al-note";
      },
    });
    src.value = CPU_PROGRAMS[st.program];

    var progTabs = tabs(
      Object.keys(CPU_PROGRAMS),
      st.program,
      function (nm) {
        st.program = nm;
        progTabs.select(nm);
        src.value = CPU_PROGRAMS[nm];
        doAssemble();
      },
      "Example program"
    );

    var errEl = h("p", { class: "al-note" });

    var cells = [];
    var ramGrid = h("div", { class: "al-ram" });
    for (var i = 0; i < 16; i++) {
      (function (idx) {
        var v = h("span", { class: "al-ram-v" });
        var lab = h("span", { class: "al-ram-l" });
        var c = h("div", { class: "al-ram-c" }, [h("span", { class: "al-ram-a", text: idx.toString(16).toUpperCase() }), v, lab]);
        cells[idx] = { box: c, v: v, l: lab };
        ramGrid.appendChild(c);
      })(i);
    }

    var rPC = statCell("PC"),
      rMAR = statCell("MAR"),
      rIR = statCell("IR"),
      rACC = statCell("ACC"),
      rZ = statCell("Z FLAG"),
      rCyc = statCell("CYCLES");
    var regs = h("div", { class: "al-stats" }, [rPC.el, rMAR.el, rIR.el, rACC.el, rZ.el, rCyc.el]);

    var phaseEl = h("p", { class: "al-phase" });
    var disEl = h("div", { class: "al-dis" });
    var outEl = h("pre", { class: "al-out", "aria-label": "Program output" });
    var live = h("p", { class: "al-live", role: "status", "aria-live": "polite" });
    var cycles = 0;

    var asmBtn = btn("Assemble ⚙", "al-btn-go", function () {
      doAssemble();
    });
    var stepBtn = btn("Micro-step ▸", "", function () {
      st.running = false;
      runBtn.textContent = "Run ▶";
      micro();
      refresh();
    });
    var instrBtn = btn("Instruction ▸▸", "", function () {
      st.running = false;
      runBtn.textContent = "Run ▶";
      var guard = 0;
      do {
        micro();
        guard++;
      } while (st.phase !== 0 && guard < 8);
      refresh();
    });
    var runBtn = btn("Run ▶", "al-btn-go", function () {
      if (st.halted) doAssemble();
      st.running = !st.running;
      runBtn.textContent = st.running ? "Pause ⏸" : "Run ▶";
    });
    var speedSel = slider("Execution speed", 0.25, 6, 0.25, 1, function (v) {
      st.speed = v;
    });

    body.appendChild(progTabs);
    body.appendChild(src);
    body.appendChild(
      h("div", { class: "al-controls" }, [
        asmBtn,
        stepBtn,
        instrBtn,
        runBtn,
        h("label", { class: "al-ctl" }, [h("span", { text: "speed" }), speedSel]),
      ])
    );
    body.appendChild(errEl);
    body.appendChild(canvasWrap(cv, "Data path and bus activity"));
    body.appendChild(phaseEl);
    body.appendChild(regs);
    body.appendChild(
      h("p", { class: "al-cap", text: "RAM — addresses 0–F. Instructions and data share the same memory; nothing marks which is which." })
    );
    body.appendChild(ramGrid);
    body.appendChild(disEl);
    body.appendChild(h("p", { class: "al-cap", text: "OUTPUT" }));
    body.appendChild(outEl);
    body.appendChild(live);

    function doAssemble() {
      var res = assemble(src.value);
      if (res.errors.length) {
        errEl.textContent = "Assembly failed — " + res.errors.join("; ");
        errEl.className = "al-note is-err";
        return;
      }
      st.ram = res.ram;
      st.labels = {};
      Object.keys(res.labels).forEach(function (k) {
        st.labels[res.labels[k]] = k;
      });
      st.pc = 0;
      st.mar = 0;
      st.ir = 0;
      st.acc = 0;
      st.out = [];
      st.z = 0;
      st.phase = 0;
      st.halted = false;
      st.running = false;
      cycles = 0;
      runBtn.textContent = "Run ▶";
      errEl.textContent = "Assembled " + res.items.length + " item" + (res.items.length === 1 ? "" : "s") + " into memory. Ready.";
      errEl.className = "al-note is-ok";
      refresh();
    }

    var PHASES = ["FETCH · MAR ← PC", "FETCH · IR ← RAM[MAR], PC ← PC+1", "DECODE · opcode | operand", "EXECUTE"];

    function micro() {
      if (st.halted) return;
      if (st.phase === 0) {
        st.mar = st.pc;
      } else if (st.phase === 1) {
        st.ir = st.ram[st.mar];
        st.pc = (st.pc + 1) & 0xf;
      } else if (st.phase === 2) {
        /* decode is wiring, not an action — shown so the count is honest */
      } else {
        var op = OPNAMES[(st.ir >> 4) & 0xf] || "NOP";
        var arg = st.ir & 0xf;
        if (op === "LDA") st.acc = st.ram[arg];
        else if (op === "ADD") st.acc = (st.acc + st.ram[arg]) & 0xff;
        else if (op === "SUB") st.acc = (st.acc - st.ram[arg]) & 0xff;
        else if (op === "STA") st.ram[arg] = st.acc;
        else if (op === "JMP") st.pc = arg;
        else if (op === "JZ") {
          if (st.z) st.pc = arg;
        } else if (op === "OUT") st.out.push(st.acc);
        else if (op === "HLT") st.halted = true;
        st.z = st.acc === 0 ? 1 : 0;
        cycles++;
      }
      st.phase = (st.phase + 1) % 4;
    }

    function disasm(byteVal) {
      var op = OPNAMES[(byteVal >> 4) & 0xf] || "NOP";
      return NEEDS_ARG[op] ? op + " " + (byteVal & 0xf).toString(16).toUpperCase() : op;
    }

    function drawBus() {
      var HH = 172;
      var f = fit(cv, HH);
      var ctx = f.ctx,
        w = f.w;
      ctx.clearRect(0, 0, w, HH);
      grid(ctx, w, HH, 22);

      var op = OPNAMES[(st.ir >> 4) & 0xf] || "NOP";
      var bw = Math.min(76, (w - 60) / 6),
        bh = 34;
      var y1 = 34,
        y2 = 108;
      var xs = [];
      for (var i2 = 0; i2 < 6; i2++) xs[i2] = 30 + i2 * ((w - 60) / 6) + ((w - 60) / 6 - bw) / 2;

      var units = [
        { n: "PC", x: xs[0], y: y1, v: st.pc.toString(16).toUpperCase(), lit: st.phase === 0 || (st.phase === 3 && (op === "JMP" || op === "JZ")) },
        { n: "MAR", x: xs[1], y: y1, v: st.mar.toString(16).toUpperCase(), lit: st.phase === 0 || st.phase === 1 },
        {
          n: "RAM",
          x: xs[2],
          y: y1,
          v: hex2(st.ram[st.mar] || 0).slice(2),
          lit: st.phase === 1 || (st.phase === 3 && (op === "LDA" || op === "ADD" || op === "SUB" || op === "STA")),
        },
        { n: "IR", x: xs[3], y: y1, v: hex2(st.ir).slice(2), lit: st.phase === 1 || st.phase === 2 },
        { n: "DECODE", x: xs[4], y: y1, v: op, lit: st.phase === 2 || st.phase === 3 },
        { n: "ALU", x: xs[3], y: y2, v: op === "ADD" ? "+" : op === "SUB" ? "−" : "·", lit: st.phase === 3 && (op === "ADD" || op === "SUB") },
        { n: "ACC", x: xs[4], y: y2, v: String(st.acc), lit: st.phase === 3 && op !== "JMP" && op !== "HLT" && op !== "NOP" },
        { n: "OUT", x: xs[5], y: y2, v: st.out.length ? String(st.out[st.out.length - 1]) : "—", lit: st.phase === 3 && op === "OUT" },
      ];

      var arrows = [
        [0, 1, st.phase === 0],
        [1, 2, st.phase === 1],
        [2, 3, st.phase === 1],
        [3, 4, st.phase === 2],
      ];
      arrows.forEach(function (a) {
        var from = units[a[0]],
          to = units[a[1]];
        wire(
          ctx,
          [
            [from.x + bw, from.y + bh / 2],
            [to.x, to.y + bh / 2],
          ],
          a[2],
          C.amber
        );
      });
      if (st.phase === 3) {
        wire(
          ctx,
          [
            [units[4].x + bw / 2, y1 + bh],
            [units[4].x + bw / 2, y2 + bh / 2],
            [units[6].x, y2 + bh / 2],
          ],
          true,
          C.cyan
        );
        if (op === "ADD" || op === "SUB") {
          wire(
            ctx,
            [
              [units[2].x + bw / 2, y1 + bh],
              [units[2].x + bw / 2, y2 + bh / 2],
              [units[5].x, y2 + bh / 2],
            ],
            true,
            C.on
          );
          wire(
            ctx,
            [
              [units[5].x + bw, y2 + bh / 2],
              [units[6].x, y2 + bh / 2],
            ],
            true,
            C.on
          );
        }
        if (op === "OUT") {
          wire(
            ctx,
            [
              [units[6].x + bw, y2 + bh / 2],
              [units[7].x, y2 + bh / 2],
            ],
            true,
            C.cyan
          );
        }
      }

      units.forEach(function (u) {
        box(ctx, u.x, u.y, bw, bh, u.lit, u.n === "ALU" || u.n === "ACC" ? C.on : C.cyan);
        label(ctx, u.n, u.x + bw / 2, u.y + 11, u.lit ? C.bright : C.text, 8, "center");
        label(ctx, u.v, u.x + bw / 2, u.y + 25, u.lit ? (u.n === "ALU" || u.n === "ACC" ? C.on : C.cyan) : C.text, 12, "center");
      });
      label(ctx, st.halted ? "HALTED" : PHASES[st.phase], w / 2, HH - 10, st.halted ? C.red : C.text, 10, "center");
    }

    function refresh() {
      rPC.v.textContent = st.pc.toString(16).toUpperCase();
      rMAR.v.textContent = st.mar.toString(16).toUpperCase();
      rIR.v.textContent = hex2(st.ir);
      rACC.v.textContent = st.acc + " / " + hex2(st.acc);
      rZ.v.textContent = String(st.z);
      rCyc.v.textContent = String(cycles);

      for (var i = 0; i < 16; i++) {
        cells[i].v.textContent = hex2(st.ram[i]).slice(2);
        cells[i].l.textContent = st.labels[i] || "";
        cells[i].box.classList.toggle("is-pc", i === st.pc && !st.halted);
        cells[i].box.classList.toggle("is-mar", i === st.mar);
      }

      phaseEl.textContent = st.halted ? "HALTED" : "PHASE " + (st.phase + 1) + "/4 · " + PHASES[st.phase];
      phaseEl.classList.toggle("is-halt", st.halted);

      disEl.textContent = "";
      [
        ["binary", bin8(st.ir).slice(0, 4) + " " + bin8(st.ir).slice(4), ""],
        ["hex", hex2(st.ir), ""],
        ["assembly", disasm(st.ir), "is-asm"],
      ].forEach(function (row) {
        disEl.appendChild(
          h("div", { class: "al-dis-row" }, [
            h("span", { class: "al-dis-k", text: row[0] }),
            h("code", { class: "al-dis-v " + row[2], text: row[1] }),
          ])
        );
      });

      outEl.textContent = st.out.length ? st.out.join("\n") : "(nothing yet)";

      live.textContent = st.halted
        ? "Halted after " + cycles + " instructions. Output: " + (st.out.length ? st.out.join(", ") : "none") + "."
        : "PC " + st.pc + ", ACC " + st.acc + ", IR " + hex2(st.ir) + " (" + disasm(st.ir) + "), phase " + (st.phase + 1) + " of 4.";

      drawBus();
    }

    addLoop(mount, function (dt) {
      if (RM) return;
      st.t += dt / 1000;
      if (st.running && st.t > 0.34 / st.speed) {
        st.t = 0;
        micro();
        if (st.halted) {
          st.running = false;
          runBtn.textContent = "Run ▶";
        }
        refresh();
      }
    });
    onResize(mount, drawBus);
    onRepaint(refresh);
    doAssemble();
  }

  /* ====================================================================== *
   * Tiny syntax highlighter for the ladder module
   * ====================================================================== */

  function escHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var LANG_RULES = {
    netlist: [
      { re: /;[^\n]*/y, c: "com" },
      { re: /\b(nmos|pmos|gate|src|drn|VDD|GND)\b/y, c: "kw" },
      { re: /\bM\d+\b/y, c: "fn" },
      { re: /\b\d+\b/y, c: "num" },
    ],
    logic: [
      { re: /;[^\n]*/y, c: "com" },
      { re: /\b(XOR|AND|OR|NAND|NOT)\b/y, c: "kw" },
      { re: /\b[A-Z]+\d+\b/y, c: "fn" },
      { re: /\b\d+\b/y, c: "num" },
    ],
    bin: [
      { re: /;[^\n]*/y, c: "com" },
      { re: /\b[01]{4,8}\b/y, c: "num" },
      { re: /\b[0-9A-F]{2}\b/y, c: "fn" },
    ],
    asm: [
      { re: /;[^\n]*/y, c: "com" },
      { re: /^[ \t]*\.?[A-Za-z_][A-Za-z0-9_]*:/my, c: "fn" },
      { re: /\b(mov|xor|lea|add|dec|jnz|ret|sub|jmp|cmp|test|push|pop)\b/y, c: "kw" },
      { re: /\b(rax|rcx|rsi|rdi|rdx|rbx)\b/y, c: "var" },
      { re: /\b\d+\b/y, c: "num" },
    ],
    c: [
      { re: /\/\/[^\n]*/y, c: "com" },
      { re: /\b(long|const|size_t|for|return|int|void|if|else|while)\b/y, c: "kw" },
      { re: /\b[a-zA-Z_]\w*(?=\()/y, c: "fn" },
      { re: /\b\d+\b/y, c: "num" },
    ],
    py: [
      { re: /#[^\n]*/y, c: "com" },
      { re: /\b(def|return|for|in|if|else|import|from|as)\b/y, c: "kw" },
      { re: /\b(sum|len|range|print)\b/y, c: "fn" },
      { re: /"[^"]*"|'[^']*'/y, c: "str" },
      { re: /\b\d+\b/y, c: "num" },
    ],
    text: [
      { re: /"[^"]*"/y, c: "str" },
      { re: /→[^\n]*/y, c: "com" },
    ],
  };

  function highlight(code, lang) {
    var rules = LANG_RULES[lang] || [];
    var out = "",
      i = 0;
    while (i < code.length) {
      var hit = null;
      for (var r = 0; r < rules.length; r++) {
        rules[r].re.lastIndex = i;
        var m = rules[r].re.exec(code);
        if (m && m.index === i && m[0].length) {
          hit = { text: m[0], c: rules[r].c };
          break;
        }
      }
      if (hit) {
        out += '<span class="al-tk-' + hit.c + '">' + escHtml(hit.text) + "</span>";
        i += hit.text.length;
      } else {
        out += escHtml(code[i]);
        i++;
      }
    }
    return out;
  }

  /* ====================================================================== *
   * MODULE: ladder — one task at every layer
   * ====================================================================== */

  var RUNGS = [
    {
      n: "Transistors",
      short: "Transistors",
      y: "1947",
      authored: 1200000,
      unit: "devices placed",
      lang: "netlist",
      code:
        "M1: nmos  gate=A  src=GND  drn=n1\n" +
        "M2: nmos  gate=B  src=n1   drn=out\n" +
        "M3: pmos  gate=A  src=VDD  drn=out\n" +
        "M4: pmos  gate=B  src=VDD  drn=out\n" +
        "; four more for the next gate\n" +
        "; ~1,200,000 more for a machine that can add a list",
      below: "Nothing. This is the floor — silicon, dopant and voltage.",
      note: "There is no program here at all. You are placing physical switches and hoping the yield holds.",
    },
    {
      n: "Logic gates",
      short: "Gates",
      y: "1937",
      authored: 300000,
      unit: "gates wired",
      lang: "logic",
      code:
        "XOR1 = XOR(A0, B0)\n" +
        "SUM0 = XOR(XOR1, C0)\n" +
        "AND1 = AND(A0, B0)\n" +
        "AND2 = AND(XOR1, C0)\n" +
        "C1   = OR(AND1, AND2)\n" +
        "; repeat 32 times for one 32-bit add\n" +
        "; then registers, a control unit, a clock",
      below: "Each gate becomes 4 to 12 transistors in static CMOS.",
      note: "Shannon’s insight: this is Boolean algebra, so it can be designed on paper instead of discovered on a bench.",
    },
    {
      n: "Machine code",
      short: "Machine",
      y: "1948",
      authored: 96,
      unit: "bytes hand-assembled",
      lang: "bin",
      code:
        "1E 2F 4D E0 F0 00 00 00\n" +
        "\n" +
        "00011110   ; load from address 14\n" +
        "00101111   ; add address 15\n" +
        "01001101   ; store to address 13\n" +
        "11100000   ; output\n" +
        "11110000   ; halt",
      below: "Each byte drives control lines that open and close gates.",
      note: "The Manchester Baby was programmed exactly like this — by hand, in binary, on a panel of switches.",
    },
    {
      n: "Assembly",
      short: "Assembly",
      y: "1947",
      authored: 14,
      unit: "lines",
      lang: "asm",
      code:
        "        mov  rcx, len\n" +
        "        xor  rax, rax\n" +
        "        lea  rsi, [xs]\n" +
        ".loop:  add  rax, [rsi]\n" +
        "        add  rsi, 8\n" +
        "        dec  rcx\n" +
        "        jnz  .loop\n" +
        "        ret",
      below: "An assembler substitutes one opcode byte per mnemonic and works out where .loop landed.",
      note: "Kathleen Booth’s contribution: let a program translate mnemonics into opcodes. The machine now does the clerical work.",
    },
    {
      n: "C",
      short: "C",
      y: "1972",
      authored: 6,
      unit: "lines",
      lang: "c",
      code: "long total(const long *xs, size_t n) {\n    long acc = 0;\n    for (size_t i = 0; i < n; i++)\n        acc += xs[i];\n    return acc;\n}",
      below: "A compiler picks the registers, the addressing mode and the loop shape — often emitting vector instructions you never asked for.",
      note: "The same source runs on machines that did not exist when it was written. That is an abstraction whose payoff is measured in decades.",
    },
    {
      n: "Python",
      short: "Python",
      y: "1991",
      authored: 1,
      unit: "line",
      lang: "py",
      code: "total = sum(xs)",
      below: "CPython dispatches ~10 million bytecode operations, each one a C function call with reference counting.",
      note: "Memory management, integer width, bounds checking and the loop itself all disappear. You pay roughly 50× in cycles for the privilege.",
    },
    {
      n: "NumPy / PyTorch",
      short: "NumPy",
      y: "2006",
      authored: 1,
      unit: "line",
      lang: "py",
      code: "total = xs.sum()   # SIMD, or 10,000 CUDA cores",
      below: "A library chooses the parallel decomposition, the tiling and the reduction tree. You never see it.",
      note: "One line now schedules work across vector units or an entire GPU. You did not choose the decomposition; something else did.",
    },
    {
      n: "Natural language",
      short: "English",
      y: "2022",
      authored: 1,
      unit: "sentence",
      lang: "text",
      code: '"Sum the numbers in xs, handle the\n empty case, and add a test."\n\n→ the program above is written for you,\n  along with tests you did not specify',
      below: "A model emits the Python, which the interpreter turns into bytecode, which becomes machine code, which switches transistors.",
      note: "The artefact you author is no longer the program. It is a description of intent, and the layer below fills in the program.",
    },
  ];

  function initLadder(mount) {
    var body = panel(mount, "ONE TASK — SUM A LIST — AT EVERY LAYER", "8 RUNGS");
    var st = { i: 7, shown: 0, target: 0 };
    var MACHINE_OPS = 2e10;

    var rail = h("div", { class: "al-rungs", role: "tablist", "aria-label": "Abstraction layer" });
    var rungEls = RUNGS.map(function (r, idx) {
      var b = h(
        "button",
        {
          type: "button",
          role: "tab",
          class: "al-rung",
          "aria-selected": "false",
          onclick: function () {
            st.i = idx;
            refresh();
          },
        },
        [h("span", { class: "al-rung-y", text: r.y }), h("span", { class: "al-rung-n", text: r.n })]
      );
      rail.appendChild(b);
      return b;
    });

    var codeEl = h("pre", { class: "al-code", tabindex: "0" });
    var belowEl = h("p", { class: "al-below" });
    var noteEl = h("p", { class: "al-note" });
    var chart = h("canvas", { class: "al-canvas", "aria-hidden": "true" });
    var authoredEl = h("span", { class: "al-stat-v al-big" });
    var leverEl = h("span", { class: "al-stat-v al-big" });
    var opsEl = h("span", { class: "al-stat-v", text: "≈ 2 × 10¹⁰" });

    body.appendChild(rail);
    body.appendChild(codeEl);
    body.appendChild(belowEl);
    body.appendChild(noteEl);
    body.appendChild(
      h("div", { class: "al-stats" }, [
        h("div", { class: "al-stat" }, [h("span", { class: "al-stat-k", text: "YOU AUTHOR" }), authoredEl]),
        h("div", { class: "al-stat" }, [h("span", { class: "al-stat-k", text: "MACHINE PERFORMS" }), opsEl]),
        h("div", { class: "al-stat" }, [h("span", { class: "al-stat-k", text: "LEVERAGE PER UNIT AUTHORED" }), leverEl]),
      ])
    );
    body.appendChild(canvasWrap(chart, "What you author at each layer, on a logarithmic scale"));
    body.appendChild(
      h("p", {
        class: "al-cap",
        text: "Counts are order-of-magnitude, for summing one million 64-bit integers. The machine column barely moves; the human column falls by six orders of magnitude.",
      })
    );

    function fmt(n) {
      if (n >= 1e9) return (n / 1e9).toFixed(1) + " billion";
      if (n >= 1e6) return (n / 1e6).toFixed(1) + " million";
      if (n >= 1e3) return Math.round(n).toLocaleString();
      return String(Math.round(n));
    }

    function drawChart() {
      var HH = 150;
      var f = fit(chart, HH);
      var ctx = f.ctx,
        w = f.w;
      ctx.clearRect(0, 0, w, HH);
      grid(ctx, w, HH, 22);
      var padL = 40,
        padB = 34,
        padT = 22;
      var plotH = HH - padB - padT;
      var barW = (w - padL - 16) / RUNGS.length;
      var maxLog = Math.log10(RUNGS[0].authored);

      for (var d = 0; d <= 6; d += 2) {
        var gy = HH - padB - (d / maxLog) * plotH;
        ctx.save();
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(padL, gy);
        ctx.lineTo(w - 10, gy);
        ctx.stroke();
        ctx.restore();
        label(ctx, "10" + ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶"][d], padL - 6, gy, C.text, 9, "right");
      }

      RUNGS.forEach(function (r, idx) {
        var lg = Math.log10(Math.max(1, r.authored));
        var bh = Math.max(2, (lg / maxLog) * plotH);
        var x = padL + idx * barW + barW * 0.18;
        var bwd = barW * 0.64;
        var active = idx === st.i;
        ctx.save();
        ctx.fillStyle = active ? C.on : C.fillOn;
        ctx.strokeStyle = active ? C.on : C.stroke;
        if (active) glowOn(ctx, C.on, 12);
        ctx.globalAlpha = active ? 0.9 : 0.55;
        ctx.fillRect(x, HH - padB - bh, bwd, bh);
        ctx.globalAlpha = 1;
        ctx.strokeRect(x, HH - padB - bh, bwd, bh);
        ctx.restore();
        label(ctx, r.y, x + bwd / 2, HH - padB + 11, active ? C.on : C.text, 8, "center");
        label(ctx, r.short, x + bwd / 2, HH - padB + 22, active ? C.on : C.text, 8, "center");
      });
      label(ctx, "units you author, log scale", w - 10, 12, C.text, 9, "right");
    }

    function refresh() {
      var r = RUNGS[st.i];
      rungEls.forEach(function (b, idx) {
        b.setAttribute("aria-selected", idx === st.i ? "true" : "false");
        b.classList.toggle("is-on", idx === st.i);
      });
      codeEl.innerHTML = highlight(r.code, r.lang);
      codeEl.setAttribute("aria-label", "Code at the " + r.n + " layer");
      belowEl.innerHTML = '<span class="al-below-k">one layer down →</span> ' + escHtml(r.below);
      noteEl.textContent = r.note;
      st.target = r.authored;
      if (RM) {
        st.shown = st.target;
      }
      paint();
      drawChart();
    }

    function paint() {
      var r = RUNGS[st.i];
      authoredEl.textContent = fmt(st.shown) + " " + r.unit;
      leverEl.textContent = fmt(MACHINE_OPS / Math.max(1, st.target));
    }

    addLoop(mount, function (dt) {
      if (RM) return;
      var d = st.target - st.shown;
      if (Math.abs(d) < 0.5) {
        if (st.shown !== st.target) {
          st.shown = st.target;
          paint();
        }
        return;
      }
      st.shown += d * Math.min(1, dt / 160);
      paint();
    });

    onResize(mount, drawChart);
    onRepaint(refresh);
    refresh();
  }

  /* ====================================================================== *
   * MODULE: timeline — 1703 to now, on a compressed axis
   * ====================================================================== */

  var CATS = {
    theory: "Theory",
    device: "Devices",
    machine: "Machines",
    language: "Languages",
    network: "Networks",
    learning: "Learning",
  };

  var EVENTS = [
    [1703, "Leibniz", "“Explication de l’Arithmétique Binaire” — base 2, written down and argued for.", "theory", "03"],
    [1837, "Babbage", "The Analytical Engine: a general-purpose mechanical computer, never finished.", "machine", "05"],
    [1843, "Ada Lovelace", "Note G — an algorithm written for a machine that did not yet exist.", "theory", "06"],
    [1854, "George Boole", "“An Investigation of the Laws of Thought”: logic becomes algebra.", "theory", "02"],
    [1936, "Alan Turing", "“On Computable Numbers” — the universal machine, and the limits of computation.", "theory", "05"],
    [1937, "Claude Shannon", "A master’s thesis proves relay circuits are Boolean algebra. The bridge from maths to hardware.", "theory", "02"],
    [1943, "McCulloch & Pitts", "A neuron modelled as a threshold unit — a logic gate with adjustable weights.", "learning", "09"],
    [1945, "von Neumann", "First Draft of a Report on the EDVAC: instructions and data share one memory.", "machine", "05"],
    [1947, "Bardeen & Brattain", "The point-contact transistor is demonstrated at Bell Labs.", "device", "01"],
    [1947, "Kathleen Booth", "Writes the first assembly language, and the assembler for it.", "language", "06"],
    [1948, "Manchester Baby", "The first stored-program computer executes a program held in electronic memory.", "machine", "05"],
    [1948, "Shannon", "“A Mathematical Theory of Communication” — the bit gets its name and its maths.", "theory", "02"],
    [1949, "David Wheeler", "EDSAC “Initial Orders”: a bootstrap loader, and the subroutine.", "language", "06"],
    [1952, "Grace Hopper", "The A-0 compiler: a program that writes machine code from symbols.", "language", "07"],
    [1957, "John Backus", "FORTRAN ships, and generates code good enough to end the argument.", "language", "07"],
    [1958, "Jack Kilby", "The first integrated circuit — several components on one piece of germanium.", "device", "01"],
    [1958, "John McCarthy", "LISP: code as data, recursion, and garbage collection.", "language", "07"],
    [1958, "Frank Rosenblatt", "The Perceptron — a machine whose weights are set by training, not design.", "learning", "09"],
    [1959, "Robert Noyce", "The planar process makes integrated circuits manufacturable at scale.", "device", "01"],
    [1959, "CODASYL", "COBOL — programming aimed deliberately at readers who are not engineers.", "language", "07"],
    [1965, "Gordon Moore", "Observes the doubling. It becomes an industry roadmap for fifty years.", "device", "01"],
    [1969, "ARPANET", "Four nodes. Packet switching in production.", "network", "08"],
    [1971, "Intel 4004", "A whole CPU on one chip: 2,300 transistors at 740 kHz.", "device", "01"],
    [1972, "Dennis Ritchie", "C — portable systems programming. Unix follows it everywhere.", "language", "07"],
    [1974, "Cerf & Kahn", "TCP: a reliable stream over networks that guarantee nothing.", "network", "08"],
    [1985, "Intel 386", "Protected mode and virtual memory reach the desktop.", "machine", "08"],
    [1986, "Rumelhart, Hinton & Williams", "Backpropagation popularised — networks learn their own representations.", "learning", "09"],
    [1989, "Tim Berners-Lee", "Proposes the Web. His manager’s note: “Vague, but exciting.”", "network", "08"],
    [1991, "Guido van Rossum", "Python 0.9.0. The same year, Linus Torvalds posts about a hobby operating system.", "language", "07"],
    [2002, "Joel Spolsky", "The Law of Leaky Abstractions: every abstraction leaks, and you still have to know what is underneath.", "theory", "08"],
    [2006, "Amazon", "EC2 — a datacentre behind an API call.", "network", "08"],
    [2007, "NVIDIA", "CUDA makes the GPU programmable for general work.", "device", "09"],
    [2012, "AlexNet", "A convolutional network on two GPUs wins ImageNet by a landslide.", "learning", "09"],
    [2017, "Vaswani et al.", "“Attention Is All You Need.” The Transformer.", "learning", "09"],
    [2020, "GPT-3", "175 billion parameters. Few-shot prompting starts to look like programming.", "learning", "10"],
    [2021, "Copilot", "Autocomplete for whole functions, trained on public code.", "learning", "10"],
    [2022, "ChatGPT", "Natural language becomes a mass-market interface to computation.", "learning", "10"],
    [2025, "Agentic coding", "Claude Code and its peers: the model reads the repository, runs the tests, and edits the files.", "learning", "10"],
  ];

  /* A linear year axis would leave 1703–1930 almost empty and pile everything
     after 1940 on top of itself. These breakpoints stretch the busy decades
     while keeping the order — and the big early gaps — honest. */
  var AXIS = [
    [1700, 0],
    [1850, 0.1],
    [1930, 0.2],
    [1950, 0.4],
    [1975, 0.58],
    [2000, 0.74],
    [2026, 1],
  ];

  function yearPos(y) {
    for (var i = 0; i < AXIS.length - 1; i++) {
      if (y <= AXIS[i + 1][0]) {
        var f = (y - AXIS[i][0]) / (AXIS[i + 1][0] - AXIS[i][0]);
        return AXIS[i][1] + f * (AXIS[i + 1][1] - AXIS[i][1]);
      }
    }
    return 1;
  }

  function initTimeline(mount) {
    var body = panel(mount, "THE RECORD — 1703 → NOW", String(EVENTS.length) + " MILESTONES");
    var sorted = EVENTS.slice().sort(function (a, b) {
      return a[0] - b[0];
    });
    var active = {};
    Object.keys(CATS).forEach(function (k) {
      active[k] = true;
    });
    var st = { i: sorted.length - 1 };

    var chips = h("div", { class: "al-tabs", role: "group", "aria-label": "Filter milestones by kind" });
    Object.keys(CATS).forEach(function (k) {
      var b = h("button", {
        type: "button",
        class: "al-tab al-cat-" + k + " is-on",
        "aria-pressed": "true",
        text: CATS[k],
        onclick: function () {
          active[k] = !active[k];
          b.classList.toggle("is-on", active[k]);
          b.setAttribute("aria-pressed", active[k] ? "true" : "false");
          rebuild();
        },
      });
      chips.appendChild(b);
    });

    var eras = h("div", { class: "al-eras" });
    [
      ["Mechanical", 1700, 1930],
      ["Electronic", 1930, 1975],
      ["Software", 1975, 2006],
      ["Learned", 2006, 2026],
    ].forEach(function (e) {
      var d = h("div", { class: "al-era" }, [h("span", { class: "al-era-t", text: e[0] })]);
      d.style.left = yearPos(e[1]) * 100 + "%";
      d.style.width = (yearPos(e[2]) - yearPos(e[1])) * 100 + "%";
      eras.appendChild(d);
    });

    var ticks = h("div", { class: "al-ticks" });
    [1700, 1850, 1930, 1950, 1975, 2000, 2026].forEach(function (y) {
      var t = h("span", { class: "al-tick", text: String(y) });
      t.style.left = yearPos(y) * 100 + "%";
      ticks.appendChild(t);
    });

    var track = h("div", { class: "al-tl-track" });
    var slider2 = h("input", {
      type: "range",
      min: "0",
      max: String(sorted.length - 1),
      step: "1",
      value: String(st.i),
      class: "al-range al-range-wide",
      "aria-label": "Scrub the timeline",
      oninput: function () {
        var vis = visible();
        var k = Math.min(vis.length - 1, Math.max(0, parseInt(slider2.value, 10)));
        st.i = vis.length ? vis[k] : 0;
        refresh();
      },
    });

    var yearEl = h("div", { class: "al-tl-year" });
    var whoEl = h("div", { class: "al-tl-who" });
    var whatEl = h("p", { class: "al-tl-what", role: "status", "aria-live": "polite" });
    var metaEl = h("div", { class: "al-tl-meta" });
    var dots = [];

    body.appendChild(chips);
    body.appendChild(h("div", { class: "al-tl-wrap" }, [eras, track, ticks]));
    body.appendChild(slider2);
    body.appendChild(h("div", { class: "al-tl-card" }, [yearEl, whoEl, whatEl, metaEl]));

    function visible() {
      var out = [];
      sorted.forEach(function (e, idx) {
        if (active[e[3]]) out.push(idx);
      });
      return out;
    }

    function rebuild() {
      track.textContent = "";
      dots = [];
      var vis = visible();
      sorted.forEach(function (e, idx) {
        if (!active[e[3]]) return;
        var d = h("button", {
          type: "button",
          class: "al-tl-dot al-cat-" + e[3],
          "aria-label": e[0] + " — " + e[1],
          onclick: function () {
            st.i = idx;
            refresh();
          },
        });
        d.style.left = yearPos(e[0]) * 100 + "%";
        track.appendChild(d);
        dots[idx] = d;
      });
      slider2.max = String(Math.max(0, vis.length - 1));
      if (vis.indexOf(st.i) === -1) st.i = vis.length ? vis[vis.length - 1] : 0;
      refresh();
    }

    function refresh() {
      var vis = visible();
      if (!vis.length) {
        yearEl.textContent = "—";
        whoEl.textContent = "No milestones selected";
        whatEl.textContent = "Turn at least one category back on.";
        metaEl.textContent = "";
        return;
      }
      var e = sorted[st.i];
      yearEl.textContent = String(e[0]);
      whoEl.textContent = e[1];
      whatEl.textContent = e[2];
      metaEl.textContent = "";
      metaEl.appendChild(h("span", { class: "al-pill al-cat-" + e[3], text: CATS[e[3]] }));
      metaEl.appendChild(h("span", { class: "al-pill", text: "layer " + e[4] }));
      slider2.value = String(Math.max(0, vis.indexOf(st.i)));
      vis.forEach(function (idx) {
        if (!dots[idx]) return;
        dots[idx].classList.toggle("is-on", idx === st.i);
        dots[idx].classList.toggle("is-past", idx < st.i);
      });
    }

    rebuild();
  }

  /* ---------------------------------------------------------------------- *
   * Boot
   * ---------------------------------------------------------------------- */

  var MODULES = {
    adder: initAdder,
    fab: initFab,
    mosfet: initMosfet,
    nand: initNand,
    latch: initLatch,
    cpu: initCpu,
    ladder: initLadder,
    timeline: initTimeline,
  };

  function boot() {
    readPalette();
    Array.prototype.forEach.call(document.querySelectorAll("[data-al-module]"), function (el) {
      var fn = MODULES[el.getAttribute("data-al-module")];
      if (!fn) return;
      try {
        fn(el);
        el.classList.add("is-ready");
      } catch (err) {
        if (window.console && console.error) console.error("[abstraction-ladder]", el.getAttribute("data-al-module"), err);
      }
    });
    watchTheme();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
