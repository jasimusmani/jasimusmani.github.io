/*!
 * abstraction-ladder.js
 * Interactive modules for the post "The Abstraction Ladder".
 * Vanilla ES6, no dependencies. Each module mounts into an element carrying
 * a data-al-module attribute and builds its own DOM.
 */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------- *
   * Shared constants and helpers
   * ---------------------------------------------------------------------- */

  var C = {
    on: "#39ff7a",
    onDim: "rgba(57,255,122,0.35)",
    off: "#1f3a2c",
    amber: "#ffb347",
    cyan: "#58e1ff",
    magenta: "#ff7ad9",
    red: "#ff5f56",
    text: "#8fae9f",
    textBright: "#d9ffe9",
    grid: "rgba(57,255,122,0.07)",
    panel: "#080d0f",
  };

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

  function wire(ctx, pts, on, color) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = on ? 2.2 : 1.3;
    ctx.strokeStyle = on ? color || C.on : C.off;
    if (on) {
      ctx.shadowColor = color || C.on;
      ctx.shadowBlur = 9;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.restore();
  }

  function node(ctx, x, y, on, color) {
    ctx.save();
    ctx.fillStyle = on ? color || C.on : C.off;
    if (on) {
      ctx.shadowColor = color || C.on;
      ctx.shadowBlur = 10;
    }
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

  /* Gate glyphs. Each draws a body occupying (x, y, w, hh) and returns the
     output pin coordinate. Input pins sit on the left edge at 1/3 and 2/3. */
  function gate(ctx, type, x, y, w, hh, out) {
    var lit = !!out;
    ctx.save();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = lit ? C.on : "#2f4f3e";
    ctx.fillStyle = lit ? "rgba(57,255,122,0.10)" : "rgba(57,255,122,0.03)";
    if (lit) {
      ctx.shadowColor = C.on;
      ctx.shadowBlur = 10;
    }
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
      /* NOT */
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
    label(ctx, type, x + w * 0.42, cy, lit ? C.textBright : C.text, 9, "center");
    return [x + w, cy];
  }

  /* ---------------------------------------------------------------------- *
   * Animation scheduler — one RAF for every visible module
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

  /* Redraw canvases when their container is resized. */
  function onResize(el, fn) {
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function () {
        fn();
      });
      ro.observe(el);
    } else {
      window.addEventListener("resize", fn);
    }
  }

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

  function signed8(n) {
    return n > 127 ? n - 256 : n;
  }

  function btn(text, cls, fn) {
    return h("button", { type: "button", class: "al-btn " + (cls || ""), onclick: fn, text: text });
  }

  /* Canvases keep a legible minimum width and scroll sideways on small screens.
     The region is focusable so it can be scrolled from the keyboard, and named
     so that name is not empty. Every diagram has a text equivalent beside it. */
  function canvasWrap(cv, name) {
    return h("div", { class: "al-canvas-wrap", tabindex: "0", role: "group", "aria-label": name + " (diagram — scroll sideways to see all of it)" }, [
      cv,
    ]);
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
      resolved: 0, // how many stages have settled
      running: false,
      speed: 1,
      stage: 0,
      signed: false,
      acc: 0,
      pulse: 0,
    };

    function compute() {
      var carry = [st.cin],
        sum = [];
      for (var i = 0; i < 8; i++) {
        var a = st.a[i],
          b = st.b[i],
          c = carry[i];
        sum[i] = a ^ b ^ c;
        carry[i + 1] = (a & b) | ((a ^ b) & c);
      }
      return { sum: sum, carry: carry };
    }

    /* ---- bit switch rows -------------------------------------------- */
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

    var cinBtn = h("button", {
      type: "button",
      class: "al-bit al-bit-c",
      role: "switch",
      "aria-checked": "false",
      "aria-label": "Carry in",
      text: "0",
      onclick: function () {
        st.cin = st.cin ? 0 : 1;
        st.resolved = 0;
        st.running = false;
        refresh();
      },
    });

    var cinRow = h("div", { class: "al-bitrow al-cinrow" }, [h("span", { class: "al-bitlabel", text: "C₀" }), cinBtn]);

    /* ---- canvases ---------------------------------------------------- */
    var chain = h("canvas", { class: "al-canvas", "aria-hidden": "true" });
    var gates = h("canvas", { class: "al-canvas", "aria-hidden": "true" });

    /* ---- controls ---------------------------------------------------- */
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

    var speed = h("input", {
      type: "range",
      min: "0.25",
      max: "4",
      step: "0.25",
      value: "1",
      class: "al-range",
      "aria-label": "Propagation speed",
      oninput: function () {
        st.speed = parseFloat(speed.value);
      },
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

    var controls = h("div", { class: "al-controls" }, [
      stepBtn,
      runBtn,
      resetBtn,
      randBtn,
      h("label", { class: "al-ctl", for: "al-signed" }, [signedBox, h("span", { text: "two’s complement" })]),
      h("label", { class: "al-ctl" }, [h("span", { text: "speed" }), speed]),
    ]);

    /* ---- readouts ---------------------------------------------------- */
    function stat(k) {
      var v = h("span", { class: "al-stat-v", text: "—" });
      var wrap = h("div", { class: "al-stat" }, [h("span", { class: "al-stat-k", text: k }), v]);
      return { el: wrap, v: v };
    }
    var sA = stat("A"),
      sB = stat("B"),
      sSum = stat("SUM"),
      sHex = stat("HEX"),
      sCout = stat("C₈"),
      sOvf = stat("OVERFLOW"),
      sDelay = stat("GATE DELAY");
    var stats = h("div", { class: "al-stats" }, [sA.el, sB.el, sSum.el, sHex.el, sCout.el, sOvf.el, sDelay.el]);

    /* ---- truth table for the selected stage --------------------------- */
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
      var A = (r >> 2) & 1,
        B = (r >> 1) & 1,
        Ci = r & 1;
      ttBody.appendChild(
        h("tr", { "data-row": String(r) }, [
          h("td", { text: String(A) }),
          h("td", { text: String(B) }),
          h("td", { text: String(Ci) }),
          h("td", { text: String(A ^ B ^ Ci) }),
          h("td", { text: String((A & B) | ((A ^ B) & Ci)) }),
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

    /* ---- drawing: the 8-stage carry chain ---------------------------- */
    function drawChain() {
      var HH = 132;
      var f = fit(chain, HH);
      var ctx = f.ctx,
        w = f.w;
      ctx.clearRect(0, 0, w, HH);
      grid(ctx, w, HH, 22);

      var res = compute();
      var padL = 62,
        padR = 26;
      var cellW = (w - padL - padR) / 8;
      var pad = padL;
      var boxW = Math.min(cellW - 10, 62);
      var boxH = 46;
      var top = 46;

      label(ctx, "MSB", padL + cellW * 0.5, 22, C.text, 10, "center");
      label(ctx, "LSB", padL + cellW * 7.5, 22, C.text, 10, "center");
      label(ctx, "← the carry travels this way", padL + cellW * 4, HH - 8, C.text, 10, "center");

      for (var k = 0; k < 8; k++) {
        var i = 7 - k; // bit index, drawn MSB left
        var cx = pad + k * cellW + (cellW - boxW) / 2;
        var settled = i < st.resolved;
        var isSel = i === st.stage;
        var carryIn = res.carry[i];
        var carryOut = res.carry[i + 1];

        /* carry wire into this stage from the right neighbour */
        if (k < 7) {
          var fromX = cx + boxW + (cellW - boxW);
          wire(
            ctx,
            [
              [cx + boxW + 6, top + boxH / 2],
              [fromX, top + boxH / 2],
            ],
            settled && carryIn === 1,
            C.amber
          );
        }

        ctx.save();
        ctx.lineWidth = isSel ? 2 : 1.2;
        ctx.strokeStyle = isSel ? C.cyan : settled ? "#2f6a4c" : "#25352d";
        ctx.fillStyle = settled ? "rgba(57,255,122,0.07)" : "rgba(255,255,255,0.015)";
        if (isSel) {
          ctx.shadowColor = C.cyan;
          ctx.shadowBlur = 12;
        }
        ctx.beginPath();
        ctx.rect(cx, top, boxW, boxH);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        label(ctx, "FA" + i, cx + boxW / 2, top + 13, isSel ? C.cyan : C.text, 10, "center");
        label(ctx, settled ? String(res.sum[i]) : "?", cx + boxW / 2, top + 33, settled ? (res.sum[i] ? C.on : C.text) : "#3d5548", 16, "center");

        /* inputs above, sum below */
        label(ctx, String(st.a[i]) + " " + String(st.b[i]), cx + boxW / 2, top - 12, C.text, 10, "center");
        label(ctx, settled ? "S" + i : "·", cx + boxW / 2, top + boxH + 14, C.text, 9, "center");

        /* wavefront glow on the stage currently resolving */
        if (st.running && i === st.resolved) {
          ctx.save();
          ctx.strokeStyle = C.amber;
          ctx.lineWidth = 2;
          ctx.shadowColor = C.amber;
          ctx.shadowBlur = 16;
          ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(st.acc * 6));
          ctx.strokeRect(cx - 3, top - 3, boxW + 6, boxH + 6);
          ctx.restore();
        }
        node(ctx, cx + boxW + 6, top + boxH / 2, settled && carryOut === 1, C.amber);
      }

      /* final carry-out */
      var coutSettled = st.resolved >= 8;
      wire(
        ctx,
        [
          [pad - 16, top + boxH / 2],
          [pad, top + boxH / 2],
        ],
        coutSettled && res.carry[8] === 1,
        C.amber
      );
      label(ctx, "C₈=" + (coutSettled ? res.carry[8] : "?"), pad - 20, top + boxH / 2, coutSettled && res.carry[8] ? C.amber : C.text, 10, "right");
    }

    /* ---- drawing: one full adder, gate level ------------------------- */
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
      var x1 = A ^ B; // XOR1
      var s = x1 ^ Ci; // XOR2 -> SUM
      var a1 = A & B; // AND1
      var a2 = x1 & Ci; // AND2
      var co = a1 | a2; // OR

      var live1 = settled;
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

      /* input stubs */
      label(ctx, "A" + i + "=" + A, inX - 6, yA, A ? C.on : C.text, 11, "right");
      label(ctx, "B" + i + "=" + B, inX - 6, yB, B ? C.on : C.text, 11, "right");
      label(ctx, "C" + i + "=" + (settled ? Ci : "?"), inX - 6, yC, settled && Ci ? C.amber : C.text, 11, "right");

      /* XOR1 (A,B) */
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
      var o1 = gate(ctx, "XOR", colA, xor1Y, gw, gh, live1 && x1);

      /* AND1 (A,B) */
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
      var o2 = gate(ctx, "AND", colA, and1Y, gw, gh, live1 && a1);

      /* XOR2 (x1, Cin) -> SUM */
      var xor2Y = 40;
      wire(ctx, [o1, [colB - 16, o1[1]], [colB - 16, xor2Y + gh * 0.3], [colB, xor2Y + gh * 0.3]], live1 && x1 === 1, C.on);
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
      var o3 = gate(ctx, "XOR", colB, xor2Y, gw, gh, live1 && s);

      /* AND2 (x1, Cin) */
      var and2Y = 110;
      wire(
        ctx,
        [
          [colB - 16, o1[1]],
          [colB - 16, and2Y + gh * 0.3],
          [colB, and2Y + gh * 0.3],
        ],
        live1 && x1 === 1,
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
      var o4 = gate(ctx, "AND", colB, and2Y, gw, gh, live1 && a2);

      /* OR (a1, a2) -> Cout */
      var orY = 180;
      wire(ctx, [o2, [colC - 20, o2[1]], [colC - 20, orY + gh * 0.72], [colC, orY + gh * 0.72]], live1 && a1 === 1, C.amber);
      wire(ctx, [o4, [colC - 34, o4[1]], [colC - 34, orY + gh * 0.28], [colC, orY + gh * 0.28]], live1 && a2 === 1, C.amber);
      var o5 = gate(ctx, "OR", colC, orY, gw, gh, live1 && co);

      /* outputs */
      wire(ctx, [o3, [w - 54, o3[1]]], live1 && s === 1, C.on);
      label(ctx, "S" + i + " = " + (settled ? s : "?"), w - 50, o3[1], live1 && s ? C.on : C.text, 12, "left");
      wire(ctx, [o5, [w - 54, o5[1]]], live1 && co === 1, C.amber);
      label(ctx, "C" + (i + 1) + " = " + (settled ? co : "?"), w - 50, o5[1], live1 && co ? C.amber : C.text, 12, "left");

      label(ctx, "5 gates · ≈28 transistors in static CMOS · carry path Cᵢₙ → AND → OR = 2 gate delays", w / 2, HH - 10, C.text, 10, "center");
    }

    /* ---- refresh ------------------------------------------------------ */
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
      cinBtn.textContent = String(st.cin);
      cinBtn.setAttribute("aria-checked", st.cin ? "true" : "false");
      cinBtn.classList.toggle("is-on", !!st.cin);

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
        : "░".repeat(8 - st.resolved) + bitstr(res.sum).slice(8 - st.resolved);
      sHex.v.textContent = done ? hex2(ns) : "—";
      sCout.v.textContent = done ? String(res.carry[8]) : "—";
      var ovf = res.carry[8] ^ res.carry[7];
      sOvf.v.textContent = done ? (st.signed ? (ovf ? "YES — signed result wrong" : "no") : res.carry[8] ? "carry out set" : "no") : "—";
      sOvf.el.classList.toggle("is-alert", done && !!(st.signed ? ovf : res.carry[8]));
      sDelay.v.textContent = st.resolved * 2 + " / 16";

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

    /* stage selection by clicking the chain canvas */
    chain.addEventListener("click", function (ev) {
      var rect = chain.getBoundingClientRect();
      var k = Math.floor(((ev.clientX - rect.left) / rect.width) * 8);
      k = Math.max(0, Math.min(7, k));
      st.stage = 7 - k;
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
      }
      if (st.running) drawChain();
    });

    onResize(mount, function () {
      drawChain();
      drawGates();
    });
    if (RM) st.resolved = 8;
    refresh();
  }

  /* ====================================================================== *
   * MODULE: fab — sand to wafer to die
   * ====================================================================== */

  var FAB_STAGES = [
    { k: "01", t: "QUARTZ SAND", d: "Silica (SiO₂) — roughly 28% of the Earth’s crust by mass." },
    { k: "02", t: "REDUCTION + PURIFICATION", d: "Carbothermic reduction, then Siemens process to 11N polysilicon: one impurity atom per 10¹¹." },
    {
      k: "03",
      t: "CZOCHRALSKI PULL",
      d: "A seed crystal is dipped in the melt and pulled while rotating. One continuous crystal lattice, 300 mm across.",
    },
    { k: "04", t: "WAFER", d: "The boule is sliced into 775 µm wafers and polished flat to about half a nanometre." },
    { k: "05", t: "PHOTOLITHOGRAPHY", d: "13.5 nm extreme-ultraviolet light, produced by vaporising tin droplets with a laser, prints the pattern." },
    { k: "06", t: "DOPING → DIE", d: "Boron and phosphorus ions are implanted to build source and drain. The wafer is diced into hundreds of dies." },
  ];

  function initFab(mount) {
    var body = panel(mount, "SAND → WAFER → DIE", "6 STAGES");
    var cv = h("canvas", { class: "al-canvas", "aria-hidden": "true" });
    var st = { i: 0, t: 0, auto: !RM };

    var tabs = h("div", { class: "al-tabs", role: "tablist", "aria-label": "Fabrication stage" });
    var tabEls = FAB_STAGES.map(function (s, idx) {
      var b = h("button", {
        type: "button",
        role: "tab",
        class: "al-tab",
        "aria-selected": idx === 0 ? "true" : "false",
        text: s.k,
        onclick: function () {
          st.i = idx;
          st.t = 0;
          st.auto = false;
          autoBtn.textContent = "Autoplay ▶";
          refresh();
        },
      });
      tabs.appendChild(b);
      return b;
    });

    var cap = h("p", { class: "al-cap", role: "status", "aria-live": "polite" });
    var autoBtn = btn(RM ? "Autoplay ▶" : "Pause ⏸", "al-btn-go", function () {
      st.auto = !st.auto;
      autoBtn.textContent = st.auto ? "Pause ⏸" : "Autoplay ▶";
    });

    body.appendChild(tabs);
    body.appendChild(canvasWrap(cv, "Silicon fabrication stage"));
    body.appendChild(cap);
    body.appendChild(h("div", { class: "al-controls" }, [autoBtn]));

    function draw() {
      var HH = 230;
      var f = fit(cv, HH);
      var ctx = f.ctx,
        w = f.w;
      ctx.clearRect(0, 0, w, HH);
      grid(ctx, w, HH, 22);
      var cx = w / 2,
        cy = HH / 2 + 6,
        t = st.t;
      ctx.save();

      if (st.i === 0) {
        var seed = 1;
        function rnd() {
          seed = (seed * 16807) % 2147483647;
          return seed / 2147483647;
        }
        for (var g = 0; g < 520; g++) {
          var gx = 16 + rnd() * (w - 32);
          var gy = 44 + rnd() * (HH - 74);
          var sz = 1 + Math.floor(rnd() * 3);
          ctx.fillStyle = g % 9 === 0 ? C.on : "rgba(143,174,159,0.55)";
          ctx.globalAlpha = 0.2 + 0.55 * Math.abs(Math.sin(t * 1.4 + g * 0.7));
          ctx.fillRect(gx, gy, sz, sz);
        }
        ctx.globalAlpha = 1;
        label(ctx, "SiO₂  —  the second most abundant compound in the crust", cx, HH - 16, C.on, 12, "center");
      } else if (st.i === 1) {
        var grd = ctx.createLinearGradient(0, cy - 50, 0, cy + 50);
        grd.addColorStop(0, "rgba(255,179,71,0.85)");
        grd.addColorStop(1, "rgba(255,95,86,0.2)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 30, 110, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        for (var b1 = 0; b1 < 14; b1++) {
          var bx = cx - 90 + ((b1 * 47 + t * 40) % 180);
          var by = cy + 30 - (((t * 30 + b1 * 20) % 70) + 6);
          ctx.fillStyle = "rgba(255,179,71,0.6)";
          ctx.beginPath();
          ctx.arc(bx, by, 2 + (b1 % 3), 0, Math.PI * 2);
          ctx.fill();
        }
        label(ctx, "Si + impurities → 99.999999999% Si", cx, cy - 60, C.amber, 12, "center");
      } else if (st.i === 2) {
        ctx.fillStyle = "rgba(255,179,71,0.25)";
        ctx.beginPath();
        ctx.ellipse(cx, cy + 60, 92, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        var pull = Math.min(1, (t % 6) / 6);
        var top = cy + 60 - 130 * pull;
        var bw = 26;
        ctx.strokeStyle = C.on;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = C.on;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(cx - bw, cy + 60);
        ctx.lineTo(cx - bw * (0.5 + 0.5 * (1 - pull)), top);
        ctx.lineTo(cx + bw * (0.5 + 0.5 * (1 - pull)), top);
        ctx.lineTo(cx + bw, cy + 60);
        ctx.stroke();
        ctx.shadowBlur = 0;
        for (var s2 = 0; s2 < 10; s2++) {
          ctx.strokeStyle = "rgba(57,255,122,0.25)";
          ctx.beginPath();
          ctx.moveTo(cx - bw + 3, cy + 56 - s2 * ((cy + 56 - top) / 10));
          ctx.lineTo(cx + bw - 3, cy + 56 - s2 * ((cy + 56 - top) / 10));
          ctx.stroke();
        }
        label(ctx, "boule ↑  " + Math.round(pull * 100) + "%", cx, 26, C.on, 12, "center");
      } else if (st.i === 3) {
        ctx.strokeStyle = C.on;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = C.on;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 84, 84, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(57,255,122,0.22)";
        ctx.lineWidth = 1;
        for (var lx = -84; lx <= 84; lx += 12) {
          ctx.beginPath();
          ctx.moveTo(cx + lx, cy - Math.sqrt(Math.max(0, 7056 - lx * lx)));
          ctx.lineTo(cx + lx, cy + Math.sqrt(Math.max(0, 7056 - lx * lx)));
          ctx.stroke();
        }
        for (var ly = -84; ly <= 84; ly += 12) {
          ctx.beginPath();
          ctx.moveTo(cx - Math.sqrt(Math.max(0, 7056 - ly * ly)), cy + ly);
          ctx.lineTo(cx + Math.sqrt(Math.max(0, 7056 - ly * ly)), cy + ly);
          ctx.stroke();
        }
        label(ctx, "300 mm · 775 µm thick", cx, HH - 18, C.text, 11, "center");
      } else if (st.i === 4) {
        var sweep = (t * 90) % (w + 120);
        ctx.fillStyle = "rgba(88,225,255,0.06)";
        ctx.fillRect(cx - 130, cy - 46, 260, 92);
        ctx.strokeStyle = "rgba(88,225,255,0.5)";
        ctx.strokeRect(cx - 130, cy - 46, 260, 92);
        for (var m = 0; m < 9; m++) {
          ctx.fillStyle = m % 2 ? "rgba(88,225,255,0.35)" : "transparent";
          ctx.fillRect(cx - 120 + m * 27, cy - 38, 16, 76);
        }
        var lg = ctx.createLinearGradient(sweep - 120, 0, sweep, 0);
        lg.addColorStop(0, "rgba(88,225,255,0)");
        lg.addColorStop(1, "rgba(88,225,255,0.55)");
        ctx.fillStyle = lg;
        ctx.fillRect(sweep - 120, 12, 120, HH - 24);
        label(ctx, "EUV λ = 13.5 nm", cx, 26, C.cyan, 12, "center");
      } else {
        var cols = 9,
          rows = 5,
          dw = 26,
          dh = 22;
        var ox = cx - (cols * dw) / 2,
          oy = cy - (rows * dh) / 2;
        for (var r2 = 0; r2 < rows; r2++) {
          for (var c2 = 0; c2 < cols; c2++) {
            var alive = (r2 * 7 + c2 * 3) % 11 !== 0;
            var flick = 0.35 + 0.5 * Math.abs(Math.sin(t * 2 + r2 + c2));
            ctx.globalAlpha = alive ? flick : 0.12;
            ctx.strokeStyle = alive ? C.on : C.red;
            ctx.lineWidth = 1;
            ctx.strokeRect(ox + c2 * dw, oy + r2 * dh, dw - 4, dh - 4);
            ctx.globalAlpha = 1;
          }
        }
        label(ctx, "each die ≈ 10¹⁰ transistors · red = yield loss", cx, HH - 16, C.text, 11, "center");
      }
      ctx.restore();

      label(ctx, FAB_STAGES[st.i].k + " " + FAB_STAGES[st.i].t, 14, 18, C.textBright, 12, "left");
    }

    function refresh() {
      tabEls.forEach(function (b, idx) {
        b.setAttribute("aria-selected", idx === st.i ? "true" : "false");
        b.classList.toggle("is-on", idx === st.i);
      });
      cap.textContent = FAB_STAGES[st.i].k + " — " + FAB_STAGES[st.i].t + ". " + FAB_STAGES[st.i].d;
      draw();
    }

    addLoop(mount, function (dt) {
      if (RM) return;
      st.t += dt / 1000;
      if (st.auto && st.t > 5) {
        st.t = 0;
        st.i = (st.i + 1) % FAB_STAGES.length;
        refresh();
        return;
      }
      draw();
    });
    onResize(mount, draw);
    refresh();
  }

  /* ====================================================================== *
   * MODULE: mosfet — the switch
   * ====================================================================== */

  function initMosfet(mount) {
    var body = panel(mount, "n-CHANNEL MOSFET — CROSS SECTION", "DRAG Vgs");
    var cv = h("canvas", { class: "al-canvas", "aria-hidden": "true" });
    var VTH = 0.7;
    var st = { vg: 0, t: 0 };

    var slider = h("input", {
      type: "range",
      min: "0",
      max: "1.8",
      step: "0.01",
      value: "0",
      class: "al-range al-range-wide",
      "aria-label": "Gate voltage in volts",
      oninput: function () {
        st.vg = parseFloat(slider.value);
        refresh();
      },
    });

    var readV = h("span", { class: "al-stat-v", text: "0.00 V" });
    var readBit = h("span", { class: "al-stat-v al-big", text: "0" });
    var readState = h("span", { class: "al-stat-v", text: "CUT-OFF" });
    var live = h("p", { class: "al-live", role: "status", "aria-live": "polite" });

    body.appendChild(canvasWrap(cv, "MOSFET cross section"));
    body.appendChild(h("div", { class: "al-controls" }, [h("label", { class: "al-ctl al-grow" }, [h("span", { text: "V₉ₛ" }), slider])]));
    body.appendChild(
      h("div", { class: "al-stats" }, [
        h("div", { class: "al-stat" }, [h("span", { class: "al-stat-k", text: "GATE VOLTAGE" }), readV]),
        h("div", { class: "al-stat" }, [
          h("span", { class: "al-stat-k", text: "THRESHOLD" }),
          h("span", { class: "al-stat-v", text: VTH.toFixed(2) + " V" }),
        ]),
        h("div", { class: "al-stat" }, [h("span", { class: "al-stat-k", text: "REGION" }), readState]),
        h("div", { class: "al-stat" }, [h("span", { class: "al-stat-k", text: "LOGIC OUT" }), readBit]),
      ])
    );
    body.appendChild(live);

    function draw() {
      var HH = 240;
      var f = fit(cv, HH);
      var ctx = f.ctx,
        w = f.w;
      ctx.clearRect(0, 0, w, HH);
      grid(ctx, w, HH, 22);

      var on = Math.max(0, Math.min(1, (st.vg - VTH) / 0.55));
      var L = Math.max(40, w * 0.12),
        R = w - Math.max(40, w * 0.12);
      var subTop = 120;

      /* p-type substrate */
      ctx.fillStyle = "rgba(255,122,217,0.07)";
      ctx.fillRect(L, subTop, R - L, 78);
      ctx.strokeStyle = "rgba(255,122,217,0.4)";
      ctx.strokeRect(L, subTop, R - L, 78);
      label(ctx, "p-type substrate (boron doped)", (L + R) / 2, subTop + 62, C.magenta, 10, "center");

      /* n+ source and drain */
      var swid = (R - L) * 0.22;
      [
        [L + 6, "SOURCE  n+"],
        [R - swid - 6, "DRAIN  n+"],
      ].forEach(function (p) {
        ctx.fillStyle = "rgba(88,225,255,0.14)";
        ctx.fillRect(p[0], subTop, swid, 34);
        ctx.strokeStyle = "rgba(88,225,255,0.6)";
        ctx.strokeRect(p[0], subTop, swid, 34);
        label(ctx, p[1], p[0] + swid / 2, subTop + 17, C.cyan, 10, "center");
      });

      /* inversion channel */
      var chX = L + 6 + swid,
        chW = R - swid - 6 - chX;
      if (on > 0) {
        ctx.save();
        ctx.globalAlpha = on;
        ctx.fillStyle = C.on;
        ctx.shadowColor = C.on;
        ctx.shadowBlur = 16;
        ctx.fillRect(chX, subTop + 2, chW, 7);
        ctx.restore();
      }
      label(ctx, on > 0 ? "inversion channel" : "no channel — depletion region", chX + chW / 2, subTop + 24, on > 0 ? C.on : C.text, 10, "center");

      /* oxide + gate */
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(chX - 8, subTop - 12, chW + 16, 11);
      label(ctx, "SiO₂ gate oxide", chX + chW / 2, subTop - 7, "#c9d6cf", 9, "center");
      ctx.fillStyle = st.vg > VTH ? "rgba(255,179,71,0.25)" : "rgba(255,179,71,0.08)";
      ctx.fillRect(chX - 8, subTop - 32, chW + 16, 19);
      ctx.strokeStyle = C.amber;
      ctx.strokeRect(chX - 8, subTop - 32, chW + 16, 19);
      label(ctx, "GATE", chX + chW / 2, subTop - 22, C.amber, 10, "center");

      /* gate voltage bar */
      wire(
        ctx,
        [
          [chX + chW / 2, subTop - 32],
          [chX + chW / 2, 44],
        ],
        st.vg > 0.05,
        C.amber
      );
      label(ctx, "V₉ₛ = " + st.vg.toFixed(2) + " V", chX + chW / 2, 32, st.vg > VTH ? C.amber : C.text, 12, "center");

      /* current carriers */
      if (on > 0 && !RM) {
        for (var e = 0; e < 22; e++) {
          var px = chX + ((e * 19 + st.t * 150 * on) % chW);
          ctx.globalAlpha = 0.4 + 0.6 * on;
          ctx.fillStyle = C.on;
          ctx.beginPath();
          ctx.arc(px, subTop + 5.5, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      /* output node */
      wire(
        ctx,
        [
          [R, subTop + 17],
          [R + 20, subTop + 17],
          [R + 20, 70],
        ],
        on > 0.5,
        C.on
      );
      label(ctx, "OUT " + (on > 0.5 ? "1" : "0"), R + 24, 62, on > 0.5 ? C.on : C.text, 12, "left");
      label(ctx, "Iᴅ ∝ (V₉ₛ − Vₜₕ)²", L, HH - 14, C.text, 10, "left");
    }

    function refresh() {
      readV.textContent = st.vg.toFixed(2) + " V";
      var open = st.vg > VTH;
      readState.textContent = open ? (st.vg > VTH + 0.5 ? "SATURATION" : "TRIODE") : "CUT-OFF";
      readBit.textContent = open ? "1" : "0";
      readBit.classList.toggle("is-on", open);
      live.textContent = open
        ? "Gate at " +
          st.vg.toFixed(2) +
          " V is above the " +
          VTH +
          " V threshold: an inversion channel has formed and the transistor conducts. Logic 1."
        : "Gate at " + st.vg.toFixed(2) + " V is below the " + VTH + " V threshold: no channel, no current. Logic 0.";
      draw();
    }

    addLoop(mount, function (dt) {
      if (RM) return;
      st.t += dt / 1000;
      if (st.vg > VTH) draw();
    });
    onResize(mount, draw);
    refresh();
  }

  /* ====================================================================== *
   * MODULE: nand — functional completeness
   * ====================================================================== */

  var NAND_BUILD = {
    NAND: {
      n: [{ i: ["A", "B"], x: 0.5, y: 0.5 }],
      out: 0,
      ins: 2,
      f: function (a, b) {
        return (a & b) ^ 1;
      },
    },
    NOT: {
      n: [{ i: ["A", "A"], x: 0.5, y: 0.5 }],
      out: 0,
      ins: 1,
      f: function (a) {
        return a ^ 1;
      },
    },
    AND: {
      n: [
        { i: ["A", "B"], x: 0.38, y: 0.5 },
        { i: [0, 0], x: 0.68, y: 0.5 },
      ],
      out: 1,
      ins: 2,
      f: function (a, b) {
        return a & b;
      },
    },
    OR: {
      n: [
        { i: ["A", "A"], x: 0.34, y: 0.26 },
        { i: ["B", "B"], x: 0.34, y: 0.74 },
        { i: [0, 1], x: 0.66, y: 0.5 },
      ],
      out: 2,
      ins: 2,
      f: function (a, b) {
        return a | b;
      },
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
      f: function (a, b) {
        return (a | b) ^ 1;
      },
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
      f: function (a, b) {
        return a ^ b;
      },
    },
  };

  function initNand(mount) {
    var body = panel(mount, "EVERY GATE FROM NAND ALONE", "NAND IS UNIVERSAL");
    var cv = h("canvas", { class: "al-canvas", "aria-hidden": "true" });
    var st = { kind: "XOR", a: 1, b: 0 };
    var names = ["NOT", "AND", "OR", "NAND", "NOR", "XOR"];

    var tabs = h("div", { class: "al-tabs", role: "tablist", "aria-label": "Target gate" });
    var tabEls = names.map(function (nm) {
      var b = h("button", {
        type: "button",
        role: "tab",
        class: "al-tab",
        "aria-selected": nm === st.kind ? "true" : "false",
        text: nm,
        onclick: function () {
          st.kind = nm;
          refresh();
        },
      });
      tabs.appendChild(b);
      return b;
    });

    function toggle(key, name) {
      return h("button", {
        type: "button",
        class: "al-bit",
        role: "switch",
        "aria-checked": st[key] ? "true" : "false",
        "aria-label": "Input " + name,
        text: String(st[key]),
        onclick: function () {
          st[key] = st[key] ? 0 : 1;
          refresh();
        },
      });
    }
    var ta = toggle("a", "A"),
      tb = toggle("b", "B");
    var inputs = h("div", { class: "al-bitrow" }, [
      h("span", { class: "al-bitlabel", text: "A" }),
      ta,
      h("span", { class: "al-bitlabel", text: "B" }),
      tb,
    ]);

    var ttBody = h("tbody");
    var tt = h("table", { class: "al-tt" }, [
      h("caption", { class: "al-tt-cap", text: "Truth table of the NAND-only construction" }),
      h("thead", {}, [
        h("tr", {}, [h("th", { scope: "col", text: "A" }), h("th", { scope: "col", text: "B" }), h("th", { scope: "col", text: "OUT" })]),
      ]),
      ttBody,
    ]);

    var counts = h("p", { class: "al-cap" });
    var live = h("p", { class: "al-live", role: "status", "aria-live": "polite" });

    body.appendChild(tabs);
    body.appendChild(inputs);
    body.appendChild(canvasWrap(cv, "NAND-only gate construction"));
    body.appendChild(counts);
    body.appendChild(live);
    body.appendChild(tt);

    function evaluate(build, a, b) {
      var vals = [];
      build.n.forEach(function (nd, idx) {
        function src(ref) {
          return ref === "A" ? a : ref === "B" ? b : vals[ref];
        }
        vals[idx] = (src(nd.i[0]) & src(nd.i[1])) ^ 1;
      });
      return vals;
    }

    function draw() {
      var HH = 220;
      var f = fit(cv, HH);
      var ctx = f.ctx,
        w = f.w;
      ctx.clearRect(0, 0, w, HH);
      grid(ctx, w, HH, 22);

      var build = NAND_BUILD[st.kind];
      var vals = evaluate(build, st.a, st.b);
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

      function pin(ref, which) {
        if (ref === "A") return [inX, yA];
        if (ref === "B") return [inX, yB];
        return [pos[ref].x + gw, pos[ref].y + gh / 2];
      }
      function val(ref) {
        return ref === "A" ? st.a : ref === "B" ? st.b : vals[ref];
      }

      build.n.forEach(function (nd, idx) {
        nd.i.forEach(function (ref, side) {
          var from = pin(ref, side);
          var to = [pos[idx].x, pos[idx].y + gh * (side === 0 ? 0.28 : 0.72)];
          var midX = (from[0] + to[0]) / 2 - side * 5;
          wire(ctx, [from, [midX, from[1]], [midX, to[1]], to], val(ref) === 1, C.on);
        });
      });
      build.n.forEach(function (nd, idx) {
        gate(ctx, "NAND", pos[idx].x, pos[idx].y, gw, gh, vals[idx]);
      });

      var outPin = [pos[build.out].x + gw, pos[build.out].y + gh / 2];
      wire(ctx, [outPin, [w - 52, outPin[1]]], vals[build.out] === 1, C.on);
      label(ctx, "OUT " + vals[build.out], w - 48, outPin[1], vals[build.out] ? C.on : C.text, 13, "left");
    }

    function refresh() {
      tabEls.forEach(function (b) {
        b.setAttribute("aria-selected", b.textContent === st.kind ? "true" : "false");
        b.classList.toggle("is-on", b.textContent === st.kind);
      });
      var build = NAND_BUILD[st.kind];
      ta.textContent = String(st.a);
      ta.setAttribute("aria-checked", st.a ? "true" : "false");
      ta.classList.toggle("is-on", !!st.a);
      tb.textContent = String(st.b);
      tb.setAttribute("aria-checked", st.b ? "true" : "false");
      tb.classList.toggle("is-on", !!st.b);
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

      counts.textContent =
        st.kind + " needs " + build.n.length + " NAND gate" + (build.n.length > 1 ? "s" : "") + " ≈ " + build.n.length * 4 + " transistors in CMOS.";
      var out = evaluate(build, st.a, st.b)[build.out];
      live.textContent = st.kind + "(" + st.a + (build.ins > 1 ? ", " + st.b : "") + ") = " + out + ".";
      draw();
    }

    onResize(mount, draw);
    refresh();
  }

  /* ====================================================================== *
   * MODULE: latch — the birth of state
   * ====================================================================== */

  function initLatch(mount) {
    var body = panel(mount, "GATED D LATCH — FOUR NANDS AND A LOOP", "MEMORY");
    var cv = h("canvas", { class: "al-canvas", "aria-hidden": "true" });
    var st = { d: 1, e: 0, q: 0, qb: 1, t: 0, running: !RM, tick: 0, hist: [] };

    function settle() {
      var s = (st.d & st.e) ^ 1;
      var r = (s & st.e) ^ 1;
      for (var k = 0; k < 12; k++) {
        var nq = (s & st.qb) ^ 1;
        var nqb = (r & nq) ^ 1;
        st.q = nq;
        st.qb = nqb;
      }
      return { s: s, r: r };
    }

    var dBtn = h("button", {
      type: "button",
      class: "al-bit is-on",
      role: "switch",
      "aria-checked": "true",
      "aria-label": "Data input D",
      text: "1",
      onclick: function () {
        st.d = st.d ? 0 : 1;
        refresh();
      },
    });
    var eBtn = h("button", {
      type: "button",
      class: "al-bit",
      role: "switch",
      "aria-checked": "false",
      "aria-label": "Enable, the clock",
      text: "0",
      onclick: function () {
        st.running = false;
        runBtn.textContent = "Run clock ▶";
        st.e = st.e ? 0 : 1;
        refresh();
      },
    });
    var runBtn = btn(RM ? "Run clock ▶" : "Stop clock ⏸", "al-btn-go", function () {
      st.running = !st.running;
      runBtn.textContent = st.running ? "Stop clock ⏸" : "Run clock ▶";
    });

    var qRead = h("span", { class: "al-stat-v al-big", text: "0" });
    var live = h("p", { class: "al-live", role: "status", "aria-live": "polite" });

    body.appendChild(
      h("div", { class: "al-bitrow" }, [
        h("span", { class: "al-bitlabel", text: "D" }),
        dBtn,
        h("span", { class: "al-bitlabel", text: "EN" }),
        eBtn,
        h("span", { class: "al-bitlabel", text: "Q" }),
        qRead,
      ])
    );
    body.appendChild(canvasWrap(cv, "Gated D latch schematic and waveforms"));
    body.appendChild(h("div", { class: "al-controls" }, [runBtn]));
    body.appendChild(live);

    function draw() {
      var HH = 250;
      var f = fit(cv, HH);
      var ctx = f.ctx,
        w = f.w;
      ctx.clearRect(0, 0, w, HH);
      grid(ctx, w, HH, 22);

      var sr = settle();
      var gw = Math.min(56, w * 0.11),
        gh = 30;
      var inX = Math.max(30, w * 0.06);
      var yD = 46,
        yE = 96;
      var c1 = w * 0.3,
        c2 = w * 0.62;

      label(ctx, "D=" + st.d, inX - 6, yD, st.d ? C.on : C.text, 11, "right");
      label(ctx, "EN=" + st.e, inX - 6, yE, st.e ? C.amber : C.text, 11, "right");

      /* N1 = NAND(D, EN) -> S̄ ; N2 = NAND(S̄, EN) -> R̄ */
      var p1 = { x: c1 - gw / 2, y: 34 },
        p2 = { x: c1 - gw / 2, y: 104 };
      wire(
        ctx,
        [
          [inX, yD],
          [p1.x - 12, yD],
          [p1.x - 12, p1.y + gh * 0.28],
          [p1.x, p1.y + gh * 0.28],
        ],
        st.d === 1,
        C.on
      );
      wire(
        ctx,
        [
          [inX, yE],
          [p1.x - 20, yE],
          [p1.x - 20, p1.y + gh * 0.72],
          [p1.x, p1.y + gh * 0.72],
        ],
        st.e === 1,
        C.amber
      );
      gate(ctx, "NAND", p1.x, p1.y, gw, gh, sr.s);
      wire(
        ctx,
        [
          [p1.x + gw, p1.y + gh / 2],
          [p2.x - 10, p1.y + gh / 2],
          [p2.x - 10, p2.y + gh * 0.28],
          [p2.x, p2.y + gh * 0.28],
        ],
        sr.s === 1,
        C.on
      );
      wire(
        ctx,
        [
          [p1.x - 20, yE],
          [p1.x - 20, p2.y + gh * 0.72],
          [p2.x, p2.y + gh * 0.72],
        ],
        st.e === 1,
        C.amber
      );
      gate(ctx, "NAND", p2.x, p2.y, gw, gh, sr.r);

      /* cross-coupled pair */
      var p3 = { x: c2 - gw / 2, y: 34 },
        p4 = { x: c2 - gw / 2, y: 104 };
      wire(
        ctx,
        [
          [p1.x + gw, p1.y + gh / 2],
          [p3.x - 22, p1.y + gh / 2],
          [p3.x - 22, p3.y + gh * 0.28],
          [p3.x, p3.y + gh * 0.28],
        ],
        sr.s === 1,
        C.on
      );
      wire(
        ctx,
        [
          [p2.x + gw, p2.y + gh / 2],
          [p4.x - 16, p2.y + gh / 2],
          [p4.x - 16, p4.y + gh * 0.72],
          [p4.x, p4.y + gh * 0.72],
        ],
        sr.r === 1,
        C.on
      );
      gate(ctx, "NAND", p3.x, p3.y, gw, gh, st.q);
      gate(ctx, "NAND", p4.x, p4.y, gw, gh, st.qb);

      /* the feedback loop — the whole point */
      wire(
        ctx,
        [
          [p3.x + gw, p3.y + gh / 2],
          [p3.x + gw + 26, p3.y + gh / 2],
          [p3.x + gw + 26, 152],
          [p4.x - 8, 152],
          [p4.x - 8, p4.y + gh * 0.28],
          [p4.x, p4.y + gh * 0.28],
        ],
        st.q === 1,
        C.cyan
      );
      wire(
        ctx,
        [
          [p4.x + gw, p4.y + gh / 2],
          [p4.x + gw + 34, p4.y + gh / 2],
          [p4.x + gw + 34, 22],
          [p3.x - 6, 22],
          [p3.x - 6, p3.y + gh * 0.72],
          [p3.x, p3.y + gh * 0.72],
        ],
        st.qb === 1,
        C.cyan
      );
      label(ctx, "feedback", p3.x + gw + 30, 164, C.cyan, 9, "left");
      label(ctx, "Q = " + st.q, w - 12, p3.y + gh / 2, st.q ? C.on : C.text, 13, "right");
      label(ctx, "Q̄ = " + st.qb, w - 12, p4.y + gh / 2, st.qb ? C.on : C.text, 12, "right");

      /* waveform strip */
      var wy = 186,
        wh = 18,
        gap = 22;
      ["D", "EN", "Q"].forEach(function (nm, row) {
        var base = wy + row * gap;
        label(ctx, nm, 14, base + wh / 2, C.text, 10, "left");
        ctx.save();
        ctx.strokeStyle = row === 1 ? C.amber : row === 2 ? C.cyan : C.on;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        var x0 = 36,
          span = w - 48;
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
      settle();
      dBtn.textContent = String(st.d);
      dBtn.setAttribute("aria-checked", st.d ? "true" : "false");
      dBtn.classList.toggle("is-on", !!st.d);
      eBtn.textContent = String(st.e);
      eBtn.setAttribute("aria-checked", st.e ? "true" : "false");
      eBtn.classList.toggle("is-on", !!st.e);
      qRead.textContent = String(st.q);
      qRead.classList.toggle("is-on", !!st.q);
      live.textContent = st.e
        ? "Enable is high: Q follows D. Q = " + st.q + "."
        : "Enable is low: the loop holds its value regardless of D. Q = " + st.q + " — this is one bit of memory.";
      draw();
    }

    addLoop(mount, function (dt) {
      if (RM) return;
      st.t += dt / 1000;
      if (st.running && st.t - st.tick > 0.6) {
        st.tick = st.t;
        st.e = st.e ? 0 : 1;
        refresh();
      }
      settle();
      st.hist.push([st.d, st.e, st.q]);
      if (st.hist.length > 220) st.hist.shift();
      draw();
    });
    onResize(mount, draw);
    refresh();
  }

  /* ====================================================================== *
   * MODULE: cpu — fetch, decode, execute
   * ====================================================================== */

  var OPS = {
    0x0: "NOP",
    0x1: "LDA",
    0x2: "ADD",
    0x3: "SUB",
    0x4: "STA",
    0x5: "JMP",
    0x6: "JZ",
    0xe: "OUT",
    0xf: "HLT",
  };
  var HAS_ARG = { LDA: 1, ADD: 1, SUB: 1, STA: 1, JMP: 1, JZ: 1 };

  function initCpu(mount) {
    var body = panel(mount, "TOY VON NEUMANN MACHINE — 16 BYTES OF RAM", "STEPPABLE");

    var PROGRAM = [0x1e, 0x2f, 0x4d, 0xe0, 0xf0, 0, 0, 0, 0, 0, 0, 0, 0, 0x00, 0x4b, 0x36];
    var st = { ram: PROGRAM.slice(), pc: 0, mar: 0, ir: 0, acc: 0, out: null, z: 0, phase: 0, halted: false, running: false, t: 0 };

    var cells = [];
    var ramGrid = h("div", { class: "al-ram" });
    for (var i = 0; i < 16; i++) {
      (function (idx) {
        var v = h("span", { class: "al-ram-v" });
        var c = h("div", { class: "al-ram-c" }, [h("span", { class: "al-ram-a", text: idx.toString(16).toUpperCase() }), v]);
        cells[idx] = { box: c, v: v };
        ramGrid.appendChild(c);
      })(i);
    }

    function reg(k) {
      var v = h("span", { class: "al-stat-v", text: "—" });
      return { el: h("div", { class: "al-stat" }, [h("span", { class: "al-stat-k", text: k }), v]), v: v };
    }
    var rPC = reg("PC"),
      rMAR = reg("MAR"),
      rIR = reg("IR"),
      rACC = reg("ACC"),
      rOUT = reg("OUT"),
      rZ = reg("Z");
    var regs = h("div", { class: "al-stats" }, [rPC.el, rMAR.el, rIR.el, rACC.el, rOUT.el, rZ.el]);

    var phaseEl = h("p", { class: "al-phase" });
    var disEl = h("div", { class: "al-dis" });
    var live = h("p", { class: "al-live", role: "status", "aria-live": "polite" });

    var stepBtn = btn("Step ▸", "", function () {
      st.running = false;
      runBtn.textContent = "Run ▶";
      micro();
      refresh();
    });
    var runBtn = btn("Run ▶", "al-btn-go", function () {
      if (st.halted) reset();
      st.running = !st.running;
      runBtn.textContent = st.running ? "Pause ⏸" : "Run ▶";
    });
    var resetBtn = btn("Reset ↺", "", function () {
      reset();
      refresh();
    });

    body.appendChild(h("div", { class: "al-controls" }, [stepBtn, runBtn, resetBtn]));
    body.appendChild(phaseEl);
    body.appendChild(regs);
    body.appendChild(
      h("p", { class: "al-cap", text: "RAM — addresses 0–F. Instructions and data live in the same memory; that is the von Neumann idea." })
    );
    body.appendChild(ramGrid);
    body.appendChild(disEl);
    body.appendChild(live);

    function reset() {
      st.ram = PROGRAM.slice();
      st.pc = 0;
      st.mar = 0;
      st.ir = 0;
      st.acc = 0;
      st.out = null;
      st.z = 0;
      st.phase = 0;
      st.halted = false;
      st.running = false;
      runBtn.textContent = "Run ▶";
    }

    var PHASES = ["FETCH — MAR ← PC", "FETCH — IR ← RAM[MAR], PC ← PC+1", "DECODE — split opcode / operand", "EXECUTE"];

    function micro() {
      if (st.halted) return;
      if (st.phase === 0) {
        st.mar = st.pc;
      } else if (st.phase === 1) {
        st.ir = st.ram[st.mar];
        st.pc = (st.pc + 1) & 0xf;
      } else if (st.phase === 2) {
        /* decode is a wiring fact, not an action — shown for honesty */
      } else {
        var op = OPS[(st.ir >> 4) & 0xf] || "NOP";
        var arg = st.ir & 0xf;
        if (op === "LDA") st.acc = st.ram[arg];
        else if (op === "ADD") st.acc = (st.acc + st.ram[arg]) & 0xff;
        else if (op === "SUB") st.acc = (st.acc - st.ram[arg]) & 0xff;
        else if (op === "STA") st.ram[arg] = st.acc;
        else if (op === "JMP") st.pc = arg;
        else if (op === "JZ" && st.z) st.pc = arg;
        else if (op === "OUT") st.out = st.acc;
        else if (op === "HLT") st.halted = true;
        st.z = st.acc === 0 ? 1 : 0;
      }
      st.phase = (st.phase + 1) % 4;
    }

    function bin8(n) {
      return ("0000000" + (n & 0xff).toString(2)).slice(-8);
    }
    function disasm(byteVal) {
      var op = OPS[(byteVal >> 4) & 0xf] || "NOP";
      return HAS_ARG[op] ? op + " " + (byteVal & 0xf).toString(16).toUpperCase() : op;
    }

    function refresh() {
      rPC.v.textContent = st.pc.toString(16).toUpperCase();
      rMAR.v.textContent = st.mar.toString(16).toUpperCase();
      rIR.v.textContent = hex2(st.ir);
      rACC.v.textContent = st.acc + " / " + hex2(st.acc);
      rOUT.v.textContent = st.out === null ? "—" : String(st.out);
      rOUT.el.classList.toggle("is-alert", st.out !== null);
      rZ.v.textContent = String(st.z);

      for (var i = 0; i < 16; i++) {
        cells[i].v.textContent = hex2(st.ram[i]).slice(2);
        cells[i].box.classList.toggle("is-pc", i === st.pc && !st.halted);
        cells[i].box.classList.toggle("is-mar", i === st.mar);
      }

      phaseEl.textContent = st.halted ? "HALTED" : "PHASE " + (st.phase + 1) + "/4 · " + PHASES[st.phase];
      phaseEl.classList.toggle("is-halt", st.halted);

      var b = st.ir;
      disEl.textContent = "";
      disEl.appendChild(
        h("div", { class: "al-dis-row" }, [
          h("span", { class: "al-dis-k", text: "binary" }),
          h("code", { class: "al-dis-v", text: bin8(b).slice(0, 4) + " " + bin8(b).slice(4) }),
        ])
      );
      disEl.appendChild(
        h("div", { class: "al-dis-row" }, [h("span", { class: "al-dis-k", text: "hex" }), h("code", { class: "al-dis-v", text: hex2(b) })])
      );
      disEl.appendChild(
        h("div", { class: "al-dis-row" }, [
          h("span", { class: "al-dis-k", text: "assembly" }),
          h("code", { class: "al-dis-v is-asm", text: disasm(b) }),
        ])
      );

      live.textContent = st.halted
        ? "Halted. Output = " + (st.out === null ? "none" : st.out) + ", stored at address D."
        : "Program counter " + st.pc + ", accumulator " + st.acc + ", instruction register " + hex2(st.ir) + " (" + disasm(st.ir) + ").";
    }

    addLoop(mount, function (dt) {
      if (RM) return;
      st.t += dt / 1000;
      if (st.running && st.t > 0.42) {
        st.t = 0;
        micro();
        if (st.halted) {
          st.running = false;
          runBtn.textContent = "Run ▶";
        }
        refresh();
      }
    });
    refresh();
  }

  /* ====================================================================== *
   * MODULE: ladder — the same task at every layer
   * ====================================================================== */

  var RUNGS = [
    {
      n: "Transistors",
      y: "1947",
      authored: 1200000,
      unit: "devices placed",
      code:
        "M1: nmos  gate=A  src=GND  drn=n1\n" +
        "M2: nmos  gate=B  src=n1   drn=out\n" +
        "M3: pmos  gate=A  src=VDD  drn=out\n" +
        "M4: pmos  gate=B  src=VDD  drn=out\n" +
        "; ... four more transistors for the next gate\n" +
        "; ... ~1,200,000 more for a machine that can add a list",
      note: "There is no program here at all. You are placing physical switches and hoping the yield holds.",
    },
    {
      n: "Logic gates",
      y: "1937",
      authored: 300000,
      unit: "gates wired",
      code:
        "XOR1  = XOR(A0, B0)\n" +
        "SUM0  = XOR(XOR1, C0)\n" +
        "AND1  = AND(A0, B0)\n" +
        "AND2  = AND(XOR1, C0)\n" +
        "C1    = OR(AND1, AND2)\n" +
        "; repeat 32 times for one 32-bit add\n" +
        "; then build registers, a control unit, a clock ...",
      note: "Shannon’s insight: this is Boolean algebra, so it can be designed on paper instead of discovered on a bench.",
    },
    {
      n: "Machine code",
      y: "1948",
      authored: 96,
      unit: "bytes hand-assembled",
      code:
        "1E 2F 4D E0 F0 00 00 00\n" +
        "0000 0001  0000 1110   ; load\n" +
        "0000 0010  0000 1111   ; add\n" +
        "0000 0100  0000 1101   ; store\n" +
        "1110 0000              ; out\n" +
        "1111 0000              ; halt",
      note: "The Manchester Baby was programmed exactly like this — by hand, in binary, with switches.",
    },
    {
      n: "Assembly",
      y: "1947",
      authored: 14,
      unit: "lines",
      code:
        "        mov  rcx, len\n" +
        "        xor  rax, rax\n" +
        "        lea  rsi, [xs]\n" +
        ".loop:  add  rax, [rsi]\n" +
        "        add  rsi, 8\n" +
        "        dec  rcx\n" +
        "        jnz  .loop\n" +
        "        ret",
      note: "Kathleen Booth’s contribution: let a program translate mnemonics into opcodes. The machine now does clerical work for us.",
    },
    {
      n: "C",
      y: "1972",
      authored: 6,
      unit: "lines",
      code:
        "long total(const long *xs, size_t n) {\n" +
        "    long acc = 0;\n" +
        "    for (size_t i = 0; i < n; i++)\n" +
        "        acc += xs[i];\n" +
        "    return acc;\n" +
        "}",
      note: "Registers, calling conventions and instruction selection are now the compiler’s problem. The same source runs on machines that did not exist when it was written.",
    },
    {
      n: "Python",
      y: "1991",
      authored: 1,
      unit: "line",
      code: "total = sum(xs)",
      note: "Memory management, integer width, bounds checking and the loop itself all disappear. You pay roughly 50× in cycles for the privilege.",
    },
    {
      n: "NumPy / PyTorch",
      y: "2006",
      authored: 1,
      unit: "line",
      code: "total = xs.sum()          # dispatches to SIMD, or to 10,000 CUDA cores",
      note: "One line now schedules work across vector units or an entire GPU. You did not choose the parallel decomposition; a library did.",
    },
    {
      n: "Natural language",
      y: "2022",
      authored: 1,
      unit: "sentence",
      code:
        '"Sum the numbers in xs, handle the empty case,\n' +
        ' and add a test."\n\n' +
        "→ the program above is written *for* you,\n" +
        "  along with the tests you did not specify",
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
    var noteEl = h("p", { class: "al-note" });
    var authoredEl = h("span", { class: "al-stat-v al-big" });
    var leverEl = h("span", { class: "al-stat-v al-big" });
    var opsEl = h("span", { class: "al-stat-v", text: "≈ 2 × 10¹⁰" });

    body.appendChild(rail);
    body.appendChild(codeEl);
    body.appendChild(noteEl);
    body.appendChild(
      h("div", { class: "al-stats" }, [
        h("div", { class: "al-stat" }, [h("span", { class: "al-stat-k", text: "YOU AUTHOR" }), authoredEl]),
        h("div", { class: "al-stat" }, [h("span", { class: "al-stat-k", text: "MACHINE PERFORMS" }), opsEl]),
        h("div", { class: "al-stat" }, [h("span", { class: "al-stat-k", text: "LEVERAGE (OPS PER UNIT AUTHORED)" }), leverEl]),
      ])
    );
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

    function refresh() {
      var r = RUNGS[st.i];
      rungEls.forEach(function (b, idx) {
        b.setAttribute("aria-selected", idx === st.i ? "true" : "false");
        b.classList.toggle("is-on", idx === st.i);
      });
      codeEl.textContent = r.code;
      codeEl.setAttribute("aria-label", "Code at the " + r.n + " layer");
      noteEl.textContent = r.note;
      st.target = r.authored;
      if (RM) {
        st.shown = st.target;
        paint();
      }
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

    refresh();
    paint();
  }

  /* ====================================================================== *
   * MODULE: timeline — 1703 to now
   * ====================================================================== */

  var EVENTS = [
    [1703, "Leibniz", "“Explication de l’Arithmétique Binaire” — base 2, written down and argued for."],
    [1837, "Babbage", "The Analytical Engine: a general-purpose mechanical computer, never finished."],
    [1843, "Ada Lovelace", "Note G — an algorithm written for a machine that did not yet exist."],
    [1854, "George Boole", "“An Investigation of the Laws of Thought”: logic becomes algebra."],
    [1936, "Alan Turing", "“On Computable Numbers” — the universal machine, and the limits of computation."],
    [1937, "Claude Shannon", "A master’s thesis proves relay circuits *are* Boolean algebra. The bridge from maths to hardware."],
    [1945, "von Neumann", "First Draft of a Report on the EDVAC: instructions and data share one memory."],
    [1947, "Bell Labs", "Bardeen, Brattain and Shockley demonstrate the point-contact transistor."],
    [1947, "Kathleen Booth", "Writes the first assembly language and its assembler."],
    [1948, "Manchester Baby", "The first stored-program computer executes a program held in electronic memory."],
    [1948, "Shannon", "“A Mathematical Theory of Communication” — the bit gets its name and its maths."],
    [1949, "David Wheeler", "EDSAC “Initial Orders”: a bootstrap loader, and the subroutine."],
    [1952, "Grace Hopper", "The A-0 compiler: a program that writes machine code from symbols."],
    [1957, "John Backus", "FORTRAN ships, and produces code fast enough that people stop arguing."],
    [1958, "Jack Kilby", "The first integrated circuit — several components on one piece of germanium."],
    [1958, "John McCarthy", "LISP: code as data, and garbage collection."],
    [1959, "Robert Noyce", "The planar process makes ICs manufacturable at scale."],
    [1959, "CODASYL", "COBOL — programming aimed deliberately at readers who are not engineers."],
    [1965, "Gordon Moore", "Observes the doubling. It becomes an industry roadmap for fifty years."],
    [1969, "ARPANET", "Four nodes. Packet switching in production."],
    [1971, "Intel 4004", "A whole CPU on one chip: 2,300 transistors, 740 kHz."],
    [1972, "Dennis Ritchie", "C — portable systems programming. Unix follows it everywhere."],
    [1974, "Cerf & Kahn", "TCP: a protocol for networks that do not trust each other."],
    [1985, "Intel 386", "Protected mode and virtual memory reach the desktop."],
    [1989, "Tim Berners-Lee", "Proposes the Web: documents addressed by URL over HTTP."],
    [1991, "Guido van Rossum", "Python 0.9.0. Also: Linus Torvalds posts about a hobby operating system."],
    [1986, "Rumelhart, Hinton & Williams", "Backpropagation popularised — networks learn their own representations."],
    [2002, "Joel Spolsky", "The Law of Leaky Abstractions: every abstraction leaks, and you still have to know what is underneath."],
    [2006, "Amazon", "EC2 — a datacentre behind an API call."],
    [2007, "NVIDIA", "CUDA makes the GPU programmable for general work."],
    [2012, "AlexNet", "A convolutional network on two GPUs wins ImageNet by a landslide."],
    [2017, "Vaswani et al.", "“Attention Is All You Need.” The Transformer."],
    [2020, "GPT-3", "175 billion parameters. Few-shot prompting starts to look like programming."],
    [2021, "Copilot", "Autocomplete for whole functions, trained on public code."],
    [2022, "ChatGPT", "Natural language becomes a mass-market interface to computation."],
    [2025, "Agentic coding", "Claude Code and its peers: the model reads the repository, runs the tests, and edits the files."],
  ];

  function initTimeline(mount) {
    var body = panel(mount, "THE RECORD — 1703 → NOW", String(EVENTS.length) + " MILESTONES");
    var sorted = EVENTS.slice().sort(function (a, b) {
      return a[0] - b[0];
    });
    var st = { i: sorted.length - 1 };

    var track = h("div", { class: "al-tl-track" });
    var dots = sorted.map(function (e, idx) {
      var d = h("button", {
        type: "button",
        class: "al-tl-dot",
        "aria-label": e[0] + " — " + e[1],
        onclick: function () {
          st.i = idx;
          slider.value = String(idx);
          refresh();
        },
      });
      d.style.left = (idx / (sorted.length - 1)) * 100 + "%";
      track.appendChild(d);
      return d;
    });

    var slider = h("input", {
      type: "range",
      min: "0",
      max: String(sorted.length - 1),
      step: "1",
      value: String(st.i),
      class: "al-range al-range-wide",
      "aria-label": "Scrub the timeline",
      oninput: function () {
        st.i = parseInt(slider.value, 10);
        refresh();
      },
    });

    var yearEl = h("div", { class: "al-tl-year" });
    var whoEl = h("div", { class: "al-tl-who" });
    var whatEl = h("p", { class: "al-tl-what", role: "status", "aria-live": "polite" });

    body.appendChild(h("div", { class: "al-tl-wrap" }, [track]));
    body.appendChild(slider);
    body.appendChild(h("div", { class: "al-tl-card" }, [yearEl, whoEl, whatEl]));

    function refresh() {
      var e = sorted[st.i];
      yearEl.textContent = String(e[0]);
      whoEl.textContent = e[1];
      whatEl.textContent = e[2];
      dots.forEach(function (d, idx) {
        d.classList.toggle("is-on", idx === st.i);
        d.classList.toggle("is-past", idx < st.i);
      });
    }
    refresh();
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
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
