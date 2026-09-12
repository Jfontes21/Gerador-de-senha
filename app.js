const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
};

const HISTORY_KEY = "password-generator-history";
const THEME_KEY = "password-generator-theme";
const HISTORY_LIMIT = 15;

const els = {
  password: document.getElementById("password"),
  generate: document.getElementById("generate"),
  regenerate: document.getElementById("regenerate"),
  copy: document.getElementById("copy"),
  copyStatus: document.getElementById("copy-status"),
  length: document.getElementById("length"),
  lengthValue: document.getElementById("length-value"),
  count: document.getElementById("count"),
  countValue: document.getElementById("count-value"),
  lower: document.getElementById("lower"),
  upper: document.getElementById("upper"),
  digits: document.getElementById("digits"),
  symbols: document.getElementById("symbols"),
  charsetHint: document.getElementById("charset-hint"),
  strengthFill: document.getElementById("strength-fill"),
  strengthLabel: document.getElementById("strength-label"),
  batchCard: document.getElementById("batch-card"),
  batchList: document.getElementById("batch-list"),
  historyList: document.getElementById("history-list"),
  clearHistory: document.getElementById("clear-history"),
  themeToggle: document.getElementById("theme-toggle"),
};

function randomIndex(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}

function shuffle(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function selectedSets() {
  return Object.entries(SETS)
    .filter(([key]) => els[key].checked)
    .map(([, chars]) => chars);
}

function generatePassword(length) {
  const pools = selectedSets();
  if (!pools.length) {
    throw new Error("Marque pelo menos um conjunto.");
  }

  const alphabet = pools.join("");
  const chars = pools.map((pool) => pool[randomIndex(pool.length)]);

  while (chars.length < length) {
    chars.push(alphabet[randomIndex(alphabet.length)]);
  }

  return shuffle(chars).join("");
}

function entropyBits(length, alphabetSize) {
  if (alphabetSize <= 1) return 0;
  return length * Math.log2(alphabetSize);
}

function strengthFrom(length, alphabetSize) {
  const bits = entropyBits(length, alphabetSize);
  if (bits < 40) return { label: "fraca", level: 1, color: "var(--fill-weak)" };
  if (bits < 60) return { label: "média", level: 2, color: "var(--fill-mid)" };
  if (bits < 80) return { label: "forte", level: 3, color: "var(--fill-strong)" };
  return { label: "muito forte", level: 4, color: "var(--fill-best)" };
}

function updateStrength(password) {
  const alphabetSize = selectedSets().join("").length;
  if (!password) {
    els.strengthFill.style.width = "0";
    els.strengthLabel.textContent = "Força: —";
    return;
  }
  const strength = strengthFrom(password.length, alphabetSize);
  els.strengthFill.style.width = `${strength.level * 25}%`;
  els.strengthFill.style.background = strength.color;
  els.strengthLabel.textContent = `Força: ${strength.label}`;
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_LIMIT)));
}

function renderHistory() {
  const items = loadHistory();
  els.historyList.innerHTML = "";
  if (!items.length) {
    els.historyList.innerHTML = "<li class='hint'>Nenhuma senha no histórico.</li>";
    return;
  }

  items.forEach((password) => {
    const li = document.createElement("li");
    li.className = "item";
    const text = document.createElement("span");
    text.textContent = password;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost";
    button.textContent = "Copiar";
    button.addEventListener("click", () => copyText(password));
    li.append(text, button);
    els.historyList.append(li);
  });
}

function pushHistory(passwords) {
  const next = [...passwords, ...loadHistory()].slice(0, HISTORY_LIMIT);
  saveHistory(next);
  renderHistory();
}

async function copyText(value) {
  if (!value) return;
  await navigator.clipboard.writeText(value);
  els.copyStatus.textContent = "Copiada.";
  window.setTimeout(() => {
    if (els.copyStatus.textContent === "Copiada.") els.copyStatus.textContent = "";
  }, 1600);
}

function renderBatch(passwords) {
  els.batchList.innerHTML = "";
  if (passwords.length <= 1) {
    els.batchCard.hidden = true;
    return;
  }

  els.batchCard.hidden = false;
  passwords.forEach((password) => {
    const li = document.createElement("li");
    li.className = "item";
    const text = document.createElement("span");
    text.textContent = password;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost";
    button.textContent = "Copiar";
    button.addEventListener("click", () => copyText(password));
    li.append(text, button);
    els.batchList.append(li);
  });
}

function generate() {
  els.charsetHint.textContent = "";
  const length = clamp(els.length.value, Number(els.length.min), Number(els.length.max));
  const count = clamp(els.count.value, Number(els.count.min), Number(els.count.max));
  els.length.value = String(length);
  els.lengthValue.value = String(length);
  els.count.value = String(count);
  els.countValue.value = String(count);

  try {
    const passwords = Array.from({ length: count }, () => generatePassword(length));
    els.password.value = passwords[0];
    updateStrength(passwords[0]);
    renderBatch(passwords);
    pushHistory(passwords);
  } catch (error) {
    els.charsetHint.textContent = error.message;
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeToggle.textContent = theme === "dark" ? "Claro" : "Escuro";
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function syncPair(range, numberInput, onChange) {
  const min = Number(range.min);
  const max = Number(range.max);

  function apply(value) {
    const next = String(clamp(value, min, max));
    range.value = next;
    numberInput.value = next;
    onChange?.();
  }

  range.addEventListener("input", () => apply(range.value));
  numberInput.addEventListener("input", () => {
    if (numberInput.value === "") return;
    apply(numberInput.value);
  });
  numberInput.addEventListener("blur", () => apply(numberInput.value || range.value));
}

syncPair(els.length, els.lengthValue, () => {
  if (els.password.value) updateStrength(els.password.value);
});
syncPair(els.count, els.countValue);

["lower", "upper", "digits", "symbols"].forEach((key) => {
  els[key].addEventListener("change", () => {
    const anyChecked = selectedSets().length > 0;
    if (!anyChecked) {
      els[key].checked = true;
      els.charsetHint.textContent = "Mantenha pelo menos um conjunto.";
    } else {
      els.charsetHint.textContent = "";
    }
    if (els.password.value) updateStrength(els.password.value);
  });
});

els.generate.addEventListener("click", generate);
els.regenerate.addEventListener("click", generate);
els.copy.addEventListener("click", () => copyText(els.password.value));
els.clearHistory.addEventListener("click", () => {
  saveHistory([]);
  renderHistory();
});

els.themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === "light" || savedTheme === "dark") {
  applyTheme(savedTheme);
} else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  applyTheme("dark");
} else {
  applyTheme("light");
}

renderHistory();
generate();
