const display = document.getElementById("display");
const subdisplay = document.getElementById("subdisplay");
const memIndicator = document.getElementById("mem-indicator");
const historyList = document.getElementById("history");
const historyEmpty = document.getElementById("history-empty");
const historyClear = document.getElementById("history-clear");
const keys = document.querySelectorAll(".key");

const MAX_DIGITS = 15;
const MAX_HISTORY = 30;

const state = {
  current: "0",
  previous: null,
  operator: null,
  overwriteNext: false,
  memory: 0,
};

const history = [];

const OPERATOR_SYMBOL = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
  "**": "^(y)",
};

const UNARY_SYMBOL = {
  sqrt: "√",
  square: "x²",
  sin: "sin",
  cos: "cos",
  tan: "tan",
  log10: "log",
  ln: "ln",
};

function format(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "Error";
  if (num !== 0 && (Math.abs(num) >= 1e15 || Math.abs(num) < 1e-9)) {
    return num.toExponential(6);
  }
  return String(Number(parseFloat(value).toFixed(10)));
}

function render() {
  display.textContent = state.current;
  display.classList.toggle("display--error", state.current === "Error");
  memIndicator.hidden = state.memory === 0;

  if (state.operator && state.previous !== null) {
    subdisplay.textContent = `${state.previous} ${OPERATOR_SYMBOL[state.operator]}`;
  } else {
    subdisplay.textContent = "";
  }
}

function renderHistory() {
  historyList.textContent = "";
  historyEmpty.hidden = history.length > 0;
  historyClear.hidden = history.length === 0;

  for (const entry of history) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history__item";
    button.dataset.value = entry.result;

    const expression = document.createElement("span");
    expression.textContent = entry.expression;

    const result = document.createElement("b");
    result.textContent = `= ${entry.result}`;

    button.append(expression, result);
    item.append(button);
    historyList.append(item);
  }
}

function addToHistory(expression, result) {
  history.unshift({ expression, result });
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  renderHistory();
}

function calculate() {
  const a = parseFloat(state.previous);
  const b = parseFloat(state.current);

  let result;
  switch (state.operator) {
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
      if (b === 0) return "Error";
      result = a / b;
      break;
    case "**":
      result = Math.pow(a, b);
      break;
    default:
      return state.current;
  }

  return Number.isFinite(result) ? format(result) : "Error";
}

function inputDigit(digit) {
  if (state.overwriteNext || state.current === "Error") {
    state.current = digit;
    state.overwriteNext = false;
    return;
  }
  if (state.current === "0") {
    state.current = digit;
    return;
  }
  const digits = state.current.replace(/[^0-9]/g, "");
  if (digits.length >= MAX_DIGITS) return;
  state.current += digit;
}

function inputDot() {
  if (state.overwriteNext || state.current === "Error") {
    state.current = "0.";
    state.overwriteNext = false;
    return;
  }
  if (!state.current.includes(".")) state.current += ".";
}

function inputSign() {
  if (state.current === "0" || state.current === "Error") return;
  state.current = state.current.startsWith("-")
    ? state.current.slice(1)
    : `-${state.current}`;
}

function inputPercent() {
  if (state.current === "Error") return;
  state.current = format(parseFloat(state.current) / 100);
  state.overwriteNext = true;
}

function inputBackspace() {
  if (state.overwriteNext || state.current === "Error") {
    state.current = "0";
    state.overwriteNext = false;
    return;
  }
  state.current = state.current.length > 1 ? state.current.slice(0, -1) : "0";
  if (state.current === "-") state.current = "0";
}

function inputOperator(operator) {
  if (state.current === "Error") return;

  if (state.operator && state.previous !== null && !state.overwriteNext) {
    const result = calculate();
    state.current = result;
    state.previous = result;
  } else {
    state.previous = state.current;
  }

  state.operator = operator;
  state.overwriteNext = true;
}

function inputEquals() {
  if (!state.operator || state.previous === null) return;

  const expression = `${state.previous} ${OPERATOR_SYMBOL[state.operator]} ${state.current}`;
  const result = calculate();
  state.current = result;
  state.previous = null;
  state.operator = null;
  state.overwriteNext = true;

  addToHistory(expression, result);
}

function inputUnary(fn) {
  if (state.current === "Error") return;

  const x = parseFloat(state.current);
  const toRad = (deg) => (deg * Math.PI) / 180;

  let result;
  switch (fn) {
    case "sqrt":
      if (x < 0) result = NaN;
      else result = Math.sqrt(x);
      break;
    case "square":
      result = x * x;
      break;
    case "sin":
      result = Math.sin(toRad(x));
      break;
    case "cos":
      result = Math.cos(toRad(x));
      break;
    case "tan":
      result = Math.tan(toRad(x));
      break;
    case "log10":
      result = x > 0 ? Math.log10(x) : NaN;
      break;
    case "ln":
      result = x > 0 ? Math.log(x) : NaN;
      break;
    default:
      return;
  }

  if (Number.isFinite(result)) {
    addToHistory(`${UNARY_SYMBOL[fn]}(${state.current})`, format(result));
  }

  state.current = Number.isFinite(result) ? format(result) : "Error";
  state.overwriteNext = true;
}

function inputMemory(action) {
  if (action === "memory-clear") {
    state.memory = 0;
    return;
  }
  if (action === "memory-recall") {
    if (state.memory === 0) return;
    state.current = format(state.memory);
    state.overwriteNext = true;
    return;
  }

  if (state.current === "Error") return;
  const delta = parseFloat(state.current);
  state.memory =
    action === "memory-add" ? state.memory + delta : state.memory - delta;
  state.overwriteNext = true;
}

function useHistoryValue(value) {
  if (value === "Error") return;
  state.current = value;
  state.previous = null;
  state.operator = null;
  state.overwriteNext = true;
}

function clearAll() {
  state.current = "0";
  state.previous = null;
  state.operator = null;
  state.overwriteNext = false;
}

function clearHistory() {
  history.length = 0;
  renderHistory();
}

const ACTIONS = {
  digit: (el) => inputDigit(el.dataset.value),
  dot: inputDot,
  sign: inputSign,
  percent: inputPercent,
  backspace: inputBackspace,
  clear: clearAll,
  operator: (el) => inputOperator(el.dataset.value),
  equals: inputEquals,
  unary: (el) => inputUnary(el.dataset.value),
  "memory-clear": () => inputMemory("memory-clear"),
  "memory-recall": () => inputMemory("memory-recall"),
  "memory-add": () => inputMemory("memory-add"),
  "memory-sub": () => inputMemory("memory-sub"),
};

function press(action, el) {
  ACTIONS[action]?.(el);
  render();
}

keys.forEach((key) => {
  key.addEventListener("click", () => press(key.dataset.action, key));
});

historyList.addEventListener("click", (event) => {
  const item = event.target.closest(".history__item");
  if (!item) return;
  useHistoryValue(item.dataset.value);
  render();
});

historyClear.addEventListener("click", clearHistory);

const KEYBOARD_MAP = {
  "+": { action: "operator", value: "+" },
  "-": { action: "operator", value: "-" },
  "*": { action: "operator", value: "*" },
  x: { action: "operator", value: "*" },
  X: { action: "operator", value: "*" },
  "/": { action: "operator", value: "/" },
  "^": { action: "operator", value: "**" },
  ".": { action: "dot" },
  ",": { action: "dot" },
  "%": { action: "percent" },
  r: { action: "unary", value: "sqrt" },
  s: { action: "unary", value: "sin" },
  c: { action: "unary", value: "cos" },
  t: { action: "unary", value: "tan" },
  g: { action: "unary", value: "log10" },
  l: { action: "unary", value: "ln" },
  Enter: { action: "equals" },
  "=": { action: "equals" },
  Escape: { action: "clear" },
  Backspace: { action: "backspace" },
};

document.addEventListener("keydown", (event) => {
  if (/^[0-9]$/.test(event.key)) {
    press("digit", { dataset: { value: event.key } });
    return;
  }

  const mapped = KEYBOARD_MAP[event.key];
  if (mapped) {
    event.preventDefault();
    press(mapped.action, { dataset: { value: mapped.value } });
  }
});

render();
renderHistory();
