/**
 * Space Calculator — Mission Control
 * Kalkulator dasar dengan antarmuka luar angkasa.
 * Vanilla JavaScript, tanpa dependensi eksternal.
 */
(function () {
  "use strict";

  /* ========== 1. Konstanta ========== */
  const MAX_DIGITS = 15;
  const ERROR_TEXT = "ERROR";
  const ERROR_MESSAGES = {
    divideByZero: "Tidak bisa membagi dengan nol",
    invalid: "Perhitungan tidak valid",
  };
  const OPERATOR_SYMBOL = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  /* ========== 2. Elemen DOM ========== */
  const dom = {
    screen: document.getElementById("screen"),
    display: document.getElementById("display"),
    secondary: document.getElementById("secondary"),
    hint: document.getElementById("hint"),
    keypad: document.getElementById("keypad"),
    starsNear: document.getElementById("starsNear"),
    starsFar: document.getElementById("starsFar"),
    starsTwinkle: document.getElementById("starsTwinkle"),
  };

  /* ========== 3. State ========== */
  const state = {
    current: "0",
    previous: null,
    operator: null,
    overwriteNext: false,
    error: null,
    lastExpression: null,
  };

  /* ========== 4. Utilitas angka ========== */

  /**
   * Membulatkan hasil floating point (mis. 0.1 + 0.2) tanpa membuat
   * bilangan bulat besar kehilangan digit, dan menolak nilai tak hingga.
   * Mengembalikan null bila hasil tidak valid.
   */
  function format(value) {
    if (!Number.isFinite(value)) return null;
    if (Number.isInteger(value) && Math.abs(value) < 1e21) {
      return String(value === 0 ? 0 : value);
    }
    const rounded = Number(value.toPrecision(15));
    if (rounded === 0) return "0";
    return String(rounded);
  }

  /** Menjalankan satu operasi. Mengembalikan { value } atau { error }. */
  function compute(a, b, operator) {
    let result;

    switch (operator) {
      case "+":
        result = a + b;
        break;
      case "-":
        result = a - b;
        break;
      case "*":
        result = a * b;
        break;
      case "/":
        if (b === 0) return { error: ERROR_MESSAGES.divideByZero };
        result = a / b;
        break;
      default:
        return { error: ERROR_MESSAGES.invalid };
    }

    const value = format(result);
    return value === null ? { error: ERROR_MESSAGES.invalid } : { value };
  }

  /* ========== 5. Render ========== */
  function render() {
    dom.display.textContent = state.error ? ERROR_TEXT : state.current;
    dom.screen.classList.toggle("screen--error", Boolean(state.error));

    if (state.operator && state.previous !== null && !state.error) {
      dom.secondary.textContent = `${state.previous} ${OPERATOR_SYMBOL[state.operator]}`;
    } else {
      dom.secondary.textContent = state.error ? "" : state.lastExpression || "";
    }

    dom.hint.textContent = state.error || "";
    dom.hint.classList.toggle("hint--visible", Boolean(state.error));
  }

  /* ========== 6. Aksi kalkulator ========== */
  function clearError() {
    state.error = null;
  }

  function resetAll() {
    clearError();
    state.current = "0";
    state.previous = null;
    state.operator = null;
    state.overwriteNext = false;
    state.lastExpression = null;
  }

  function fail(message) {
    state.error = message;
    state.previous = null;
    state.operator = null;
    state.overwriteNext = false;
    state.lastExpression = null;
  }

  function inputDigit(digit) {
    if (state.error || state.overwriteNext) {
      clearError();
      state.current = digit;
      state.overwriteNext = false;
      return;
    }
    if (state.current === "0") {
      state.current = digit;
      return;
    }
    if (countDigits(state.current) >= MAX_DIGITS) return;
    state.current += digit;
  }

  function inputDot() {
    if (state.error || state.overwriteNext) {
      clearError();
      state.current = "0.";
      state.overwriteNext = false;
      return;
    }
    if (!state.current.includes(".")) state.current += ".";
  }

  function inputPercent() {
    if (state.error) return;
    const value = format(parseFloat(state.current) / 100);
    if (value === null) return fail(ERROR_MESSAGES.invalid);
    state.current = value;
    state.overwriteNext = true;
  }

  function inputBackspace() {
    clearError();
    if (state.overwriteNext) {
      state.current = "0";
      state.overwriteNext = false;
      return;
    }
    state.current = state.current.length > 1 ? state.current.slice(0, -1) : "0";
    if (state.current === "-" || state.current === "") state.current = "0";
  }

  function inputOperator(operator) {
    if (state.error) {
      clearError();
      state.current = "0";
      state.previous = null;
      state.overwriteNext = false;
    }

    if (state.operator && state.previous !== null && !state.overwriteNext) {
      const chained = compute(
        parseFloat(state.previous),
        parseFloat(state.current),
        state.operator
      );
      if ("error" in chained) return fail(chained.error);
      state.current = chained.value;
      state.previous = chained.value;
    } else {
      state.previous = state.current;
    }

    state.operator = operator;
    state.overwriteNext = true;
  }

  function inputEquals() {
    if (state.error || !state.operator || state.previous === null) return;

    const left = state.previous;
    const right = state.current;
    const result = compute(parseFloat(left), parseFloat(right), state.operator);

    if ("error" in result) return fail(result.error);

    state.lastExpression = `${left} ${OPERATOR_SYMBOL[state.operator]} ${right} =`;
    state.current = result.value;
    state.previous = null;
    state.operator = null;
    state.overwriteNext = true;
  }

  function countDigits(text) {
    return text.replace(/[^0-9]/g, "").length;
  }

  /* ========== 7. Pengenbindingan input ========== */
  const ACTIONS = {
    digit: (value) => inputDigit(value),
    dot: inputDot,
    percent: inputPercent,
    backspace: inputBackspace,
    clear: resetAll,
    operator: (value) => inputOperator(value),
    equals: inputEquals,
  };

  function press(action, value) {
    const handler = ACTIONS[action];
    if (handler) handler(value);
    render();
  }

  /** Efek tekan singkat, termasuk untuk input keyboard. */
  function flash(action, value) {
    const selector =
      value === undefined
        ? `.key[data-action="${action}"]`
        : `.key[data-action="${action}"][data-value="${value}"]`;
    const key = dom.keypad.querySelector(selector);
    if (!key) return;

    key.classList.add("is-hit");
    window.setTimeout(() => key.classList.remove("is-hit"), 140);
  }

  dom.keypad.addEventListener("click", (event) => {
    const key = event.target.closest(".key");
    if (!key) return;
    const { action, value } = key.dataset;
    press(action, value);
    flash(action, value);
  });

  const KEYBOARD_MAP = {
    "+": ["operator", "+"],
    "-": ["operator", "-"],
    "*": ["operator", "*"],
    x: ["operator", "*"],
    X: ["operator", "*"],
    "/": ["operator", "/"],
    ".": ["dot"],
    ",": ["dot"],
    "%": ["percent"],
    Backspace: ["backspace"],
    Delete: ["clear"],
    Escape: ["clear"],
    c: ["clear"],
    C: ["clear"],
    Enter: ["equals"],
    "=": ["equals"],
  };

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (/^[0-9]$/.test(event.key)) {
      press("digit", event.key);
      flash("digit", event.key);
      return;
    }

    const mapping = KEYBOARD_MAP[event.key];
    if (!mapping) return;

    event.preventDefault();
    const [action, value] = mapping;
    press(action, value);
    flash(action, value);
  });

  /* ========== 8. bintang di latar ========== */
  const STAR_FIELD = {
    starsTwinkle: { count: 70, spread: 62, minAlpha: 0.35, maxAlpha: 1 },
    starsNear: { count: 46, spread: 58, minAlpha: 0.3, maxAlpha: 0.85 },
    starsFar: { count: 90, spread: 64, minAlpha: 0.12, maxAlpha: 0.45 },
  };

  const STAR_TINTS = ["255, 255, 255", "255, 255, 255", "186, 226, 255", "206, 186, 255"];

  function buildStarField(element, config) {
    if (!element) return;

    const shadows = [];
    for (let i = 0; i < config.count; i += 1) {
      const x = (Math.random() * 2 - 1) * config.spread;
      const y = (Math.random() * 2 - 1) * config.spread;
      const blur = (Math.random() * 1.4 + 0.3).toFixed(2);
      const alpha = (config.minAlpha + Math.random() * (config.maxAlpha - config.minAlpha)).toFixed(2);
      const tint = STAR_TINTS[Math.floor(Math.random() * STAR_TINTS.length)];
      shadows.push(`${x.toFixed(2)}vw ${y.toFixed(2)}vh 0 ${blur}px rgba(${tint}, ${alpha})`);
    }

    element.style.boxShadow = shadows.join(",");
  }

  /* ========== 9. Inisialisasi ========== */
  buildStarField(dom.starsNear, STAR_FIELD.starsNear);
  buildStarField(dom.starsFar, STAR_FIELD.starsFar);
  buildStarField(dom.starsTwinkle, STAR_FIELD.starsTwinkle);
  render();
})();
