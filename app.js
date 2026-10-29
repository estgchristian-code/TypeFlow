'use strict';

// Textos em português por duração (progressivamente maiores)
const TEXTS_BY_DURATION = {
  15: [
    "Sol brilha ao amanhecer.",
    "Chuva traz frescor.",
    "Bom café pela manhã.",
    "Vento move as folhas.",
    "Paz começa com sorriso."
  ],
  30: [
    "O sol brilha e aquece a terra todos os dias.",
    "A chuva cai e refresca o ar da cidade.",
    "Viajar ensina mais que ler muitos livros.",
    "A amizade resiste ao tempo e à distância.",
    "Saber ouvir é tão importante quanto falar."
  ],
  60: [
    "O sol brilha forte no céu azul e aquece a terra. A vida é feita de escolhas pequenas todos os dias, que aos poucos moldam nosso destino.",
    "A chuva cai suave sobre as folhas e forma pequenas poças. Viajar nos ensina muito mais que estudar em livros sobre diferentes culturas.",
    "A persistência é a chave para alcançar qualquer objetivo. O café pela manhã traz energia para começar o dia com disposição.",
    "Aprender algo novo todos os dias nos torna mais inteligentes. A amizade verdadeira resiste ao tempo e à distância com carinho.",
    "Saber ouvir é tão importante quanto saber falar. O segredo da felicidade está em apreciar o que já temos ao nosso redor."
  ],
  120: [
    "A natureza nos oferece ar puro e água limpa, mas cabe a nós preservá-los. Pequenas atitudes já fazem diferença.\n\nCuidar do meio ambiente é um dever de todos, hoje e para as próximas gerações.",
    "Aprender a ouvir é tão importante quanto saber falar. Um diálogo calmo pode resolver conflitos.\n\nRespeitar o outro é o primeiro passo para construir relações mais justas e duradouras.",
    "O tempo passa rápido e raramente volta. Investir em coisas que realmente importam traz mais paz.\n\nValorizar o presente é a melhor forma de construir um futuro mais tranquilo.",
    "Conhecer novas histórias amplia nossos horizontes e nos torna mais empáticos. Cada experiência ensina algo valioso.\n\nViajar, ler ou conversar já são formas simples de crescer todos os dias.",
    "A gratidão transforma a maneira como vemos a vida. Ao reconhecer o que temos, ficamos mais contentes.\n\nEsse hábito simples ajuda a enfrentar desafios com mais calma e esperança."
  ]
};

const STORAGE_KEY = 'typeflow_history';
const MAX_HISTORY_ITEMS = 10;
const MAX_HISTORY_SCAN = 100;
const MAX_STORAGE_LENGTH = 100000;
const MAX_METRIC_VALUE = 1000000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const VALID_DURATIONS = [15, 30, 60, 120];
const DEFAULT_DURATION = 30;

// Estado do teste
let currentText = "";
let currentInput = "";
let testDuration = DEFAULT_DURATION;
let timeRemaining = DEFAULT_DURATION;
let timerInterval = null;
let timerStarted = false;
let testStartedAt = 0;
let testActive = false;
let completionTimeout = null;
let focusTimeout = null;
let focusAnimationFrame = null;
let correctChars = 0;
let incorrectChars = 0;
let totalCharsTyped = 0;

// Elementos DOM
const setupScreen = document.getElementById('setupScreen');
const testScreen = document.getElementById('testScreen');
const resultsScreen = document.getElementById('resultsScreen');

const durationRadios = document.getElementsByName('duration');
const startBtn = document.getElementById('startBtn');
const cancelBtn = document.getElementById('cancelBtn');

const timerEl = document.getElementById('timer');
const ppmEl = document.getElementById('ppm');
const accuracyEl = document.getElementById('accuracy');
const errorsEl = document.getElementById('errors');
const textDisplay = document.getElementById('textDisplay');
const typingInput = document.getElementById('typingInput');

const resultPpm = document.getElementById('resultPpm');
const resultAccuracy = document.getElementById('resultAccuracy');
const resultChars = document.getElementById('resultChars');
const resultErrors = document.getElementById('resultErrors');
const restartBtn = document.getElementById('restartBtn');
const backToSetupBtn = document.getElementById('backToSetupBtn');

const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// Obter duração selecionada
function getSelectedDuration() {
  for (let i = 0; i < durationRadios.length; i++) {
    if (durationRadios[i].checked) {
      const duration = Number.parseInt(durationRadios[i].value, 10);
      return VALID_DURATIONS.includes(duration) ? duration : DEFAULT_DURATION;
    }
  }
  return DEFAULT_DURATION;
}

// Selecionar texto aleatoriamente da categoria correspondente à duração
function getSelectedText() {
  const duration = getSelectedDuration();
  const texts = TEXTS_BY_DURATION[duration] || TEXTS_BY_DURATION[DEFAULT_DURATION];
  if (!Array.isArray(texts) || texts.length === 0) {
    return "O sol brilha forte no céu azul e aquece a terra.";
  }
  const randomIndex = Math.floor(Math.random() * texts.length);
  return texts[randomIndex];
}

// Atualizar exibição do texto com cores (sem inserir HTML não confiável)
function updateTextDisplay() {
  if (!textDisplay) return;

  const fragment = document.createDocumentFragment();
  if (!currentText) {
    textDisplay.replaceChildren();
    return;
  }

  for (let i = 0; i < currentText.length; i++) {
    const char = currentText[i];

    if (char === '\r') {
      continue;
    }

    if (char === '\n') {
      fragment.appendChild(document.createElement('br'));
      continue;
    }

    let className = 'char untyped';
    if (i < currentInput.length) {
      className = currentInput[i] === char ? 'char correct' : 'char incorrect';
    } else if (i === currentInput.length) {
      className = 'char current';
    }

    const span = document.createElement('span');
    span.className = className;
    span.textContent = char;
    fragment.appendChild(span);
  }

  textDisplay.replaceChildren(fragment);
}

// Calcular PPM
// Fórmula: (caracteres corretos ÷ 5) × (60 ÷ duração em segundos)
// Ou seja: caracteres corretos × 60 / (5 × duração)
function calculatePpm() {
  if (testDuration <= 0) return 0;
  // Mínimo de 1 segundo evita PPM zero quando o texto termina antes do 1º tique.
  const seconds = Math.max(1, testDuration - timeRemaining);
  return Math.round((correctChars * 60) / (5 * seconds));
}

// Calcular precisão
// Precisão = (caracteres corretos ÷ caracteres digitados) × 100
function calculateAccuracy() {
  if (totalCharsTyped === 0) return 100;
  const accuracy = (correctChars / totalCharsTyped) * 100;
  return Math.max(0, Math.round(accuracy * 10) / 10);
}

// Atualizar estatísticas em tempo real
function updateStats() {
  if (ppmEl) ppmEl.textContent = String(calculatePpm());
  if (accuracyEl) accuracyEl.textContent = calculateAccuracy() + '%';
  if (errorsEl) errorsEl.textContent = String(incorrectChars);
}

// Atualizar cronômetro exibido
function updateTimerDisplay() {
  if (!timerEl) return;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  timerEl.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

// Limpar apenas o intervalo do cronômetro
function stopTimer() {
  if (timerInterval !== null) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
  testStartedAt = 0;
}

// Limpar finalização agendada ao completar o texto
function clearCompletionTimeout() {
  if (completionTimeout !== null) {
    window.clearTimeout(completionTimeout);
    completionTimeout = null;
  }
}

// Limpar o foco automático agendado
function clearFocusScheduling() {
  if (focusTimeout !== null) {
    window.clearTimeout(focusTimeout);
    focusTimeout = null;
  }
  if (focusAnimationFrame !== null) {
    if (typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(focusAnimationFrame);
    }
    focusAnimationFrame = null;
  }
}

// Relógio monotônico para o cronômetro não sofrer com ajustes do relógio do sistema.
function getNow() {
  if (window.performance && typeof window.performance.now === 'function') {
    return window.performance.now();
  }
  return Date.now();
}

// Iniciar cronômetro
function startTimer() {
  if (timerStarted || !testActive) return;
  timerStarted = true;
  testStartedAt = getNow();

  timerInterval = window.setInterval(() => {
    if (!testActive) {
      stopTimer();
      return;
    }

    // Usa o relógio real em vez de contar tiques: abas em segundo plano
    // podem ter os intervalos atrasados sem prolongar o teste.
    const elapsedSeconds = Math.floor(
      Math.max(0, getNow() - testStartedAt) / 1000
    );
    timeRemaining = Math.max(0, testDuration - elapsedSeconds);
    updateTimerDisplay();
    updateStats();

    if (timeRemaining === 0) {
      endTest();
    }
  }, 1000);
}

// Agendar finalização após o texto ser totalmente digitado
function scheduleCompletion() {
  // Só agenda uma vez; digitar além do texto não deve adiar o fim do teste.
  if (completionTimeout !== null) return;

  completionTimeout = window.setTimeout(() => {
    completionTimeout = null;
    if (!testActive) return;
    if (currentText.length > 0 && currentInput.length >= currentText.length) {
      endTest();
    }
  }, 100);
}

// Calcular e persistir o resultado, exibindo a tela final
function endTest() {
  // Evita finalização duplicada (fim do tempo + texto concluído)
  if (!testActive) return;

  testActive = false;
  timerStarted = false;
  stopTimer();
  clearCompletionTimeout();
  clearFocusScheduling();

  if (typingInput) {
    typingInput.disabled = true;
  }

  const ppm = calculatePpm();
  const accuracy = calculateAccuracy();
  const errors = incorrectChars;
  const charsTyped = totalCharsTyped;

  if (resultPpm) resultPpm.textContent = String(ppm);
  if (resultAccuracy) resultAccuracy.textContent = accuracy + '%';
  if (resultChars) resultChars.textContent = String(charsTyped);
  if (resultErrors) resultErrors.textContent = String(errors);

  showScreen(resultsScreen);
  saveToHistory(ppm, accuracy, charsTyped, errors);
}

// Resetar o estado do teste e limpar todos os temporizadores
function resetTestState() {
  stopTimer();
  clearCompletionTimeout();
  clearFocusScheduling();

  testActive = false;
  timerStarted = false;
  currentText = '';
  currentInput = '';
  correctChars = 0;
  incorrectChars = 0;
  totalCharsTyped = 0;
  timeRemaining = testDuration;

  if (typingInput) {
    typingInput.disabled = true;
    typingInput.value = '';
  }
  if (textDisplay) {
    textDisplay.replaceChildren();
  }
}

// Mostrar somente a tela informada
function showScreen(screen) {
  [setupScreen, testScreen, resultsScreen].forEach((element) => {
    if (element) {
      element.classList.toggle('active', element === screen);
    }
  });
}

// Focar o campo de digitação após a troca de tela
function focusTypingInput() {
  if (!typingInput) return;
  try {
    typingInput.focus();
    if (typeof typingInput.setSelectionRange === 'function') {
      typingInput.setSelectionRange(0, 0);
    }
  } catch (e) {
    // O navegador pode recusar o foco; o teste continua funcional.
  }
}

function scheduleTypingFocus() {
  clearFocusScheduling();

  const focusIfActive = () => {
    focusTimeout = null;
    focusAnimationFrame = null;
    if (testActive) {
      focusTypingInput();
    }
  };

  // Uma única tentativa: rAF quando disponível, com timeout como fallback.
  if (typeof window.requestAnimationFrame === 'function') {
    focusAnimationFrame = window.requestAnimationFrame(focusIfActive);
  } else {
    focusTimeout = window.setTimeout(focusIfActive, 0);
  }
}

// Iniciar um novo teste
function startTest() {
  resetTestState();

  testActive = true;
  timerStarted = false;
  testDuration = getSelectedDuration();
  timeRemaining = testDuration;
  currentText = getSelectedText();
  currentInput = '';
  correctChars = 0;
  incorrectChars = 0;
  totalCharsTyped = 0;

  updateTimerDisplay();
  if (ppmEl) ppmEl.textContent = '0';
  if (accuracyEl) accuracyEl.textContent = '100%';
  if (errorsEl) errorsEl.textContent = '0';

  updateTextDisplay();

  if (typingInput) {
    typingInput.disabled = false;
    typingInput.value = '';
    typingInput.blur();
  }

  showScreen(testScreen);
  scheduleTypingFocus();
}

// Cancelar teste (não salva histórico)
function cancelTest() {
  returnToSetup();
}

// Voltar para a configuração, descartando o teste atual
function returnToSetup() {
  resetTestState();
  showScreen(setupScreen);
  loadHistory();
}

// Executa uma operação no localStorage sem deixar falhas de acesso
// (modo privado, bloqueio do navegador, cota etc.) quebrarem a aplicação.
function withStorage(operation, fallback) {
  try {
    const storage = window.localStorage;
    if (!storage) return fallback;
    return operation(storage);
  } catch (e) {
    return fallback;
  }
}

function readStorage(key) {
  return withStorage((storage) => storage.getItem(key), null);
}

function writeStorage(key, value) {
  return withStorage((storage) => {
    storage.setItem(key, value);
    return true;
  }, false);
}

function removeStorage(key) {
  return withStorage((storage) => {
    storage.removeItem(key);
    return true;
  }, false);
}

// Validar e normalizar um resultado antes de salvar ou exibir
function createHistoryEntry(ppm, accuracy, charsTyped, errors, duration, date) {
  if (!Number.isFinite(ppm) || !Number.isFinite(accuracy) ||
      !Number.isFinite(charsTyped) || !Number.isFinite(errors)) {
    return null;
  }
  if (!VALID_DURATIONS.includes(duration)) return null;
  if (ppm < 0 || ppm > MAX_METRIC_VALUE) return null;
  if (accuracy < 0 || accuracy > 100) return null;
  if (!Number.isInteger(charsTyped) || charsTyped < 0 || charsTyped > MAX_METRIC_VALUE) return null;
  if (!Number.isInteger(errors) || errors < 0 || errors > charsTyped) return null;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;

  return {
    ppm: Math.round(ppm),
    accuracy: Math.round(accuracy * 10) / 10,
    charactersTyped: charsTyped,
    errors: errors,
    duration: duration,
    date: date.toISOString()
  };
}

// Converter um item desconhecido do localStorage em um resultado válido
function normalizeHistoryEntry(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (typeof raw.ppm !== 'number' ||
      typeof raw.accuracy !== 'number' ||
      typeof raw.charactersTyped !== 'number' ||
      typeof raw.errors !== 'number' ||
      typeof raw.duration !== 'number' ||
      typeof raw.date !== 'string' ||
      !ISO_DATE_PATTERN.test(raw.date)) {
    return null;
  }

  return createHistoryEntry(
    raw.ppm,
    raw.accuracy,
    raw.charactersTyped,
    raw.errors,
    raw.duration,
    new Date(raw.date)
  );
}

// Salvar no histórico (últimos 10)
function saveToHistory(ppm, accuracy, charsTyped, errors) {
  const entry = createHistoryEntry(
    ppm,
    accuracy,
    charsTyped,
    errors,
    testDuration,
    new Date()
  );
  if (!entry) return;

  const history = getHistory();
  history.unshift(entry);
  const serialized = JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS));
  if (writeStorage(STORAGE_KEY, serialized)) {
    loadHistory();
  }
}

// Obter e validar o histórico armazenado
function getHistory() {
  const stored = readStorage(STORAGE_KEY);
  if (stored === null || stored === '') return [];

  if (stored.length > MAX_STORAGE_LENGTH) {
    removeStorage(STORAGE_KEY);
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(stored);
  } catch (e) {
    // Descarta conteúdo corrompido para não ser reprocessado a cada leitura.
    removeStorage(STORAGE_KEY);
    return [];
  }

  if (!Array.isArray(parsed)) {
    removeStorage(STORAGE_KEY);
    return [];
  }

  const history = [];
  const scanLimit = Math.min(parsed.length, MAX_HISTORY_SCAN);
  for (let i = 0; i < scanLimit && history.length < MAX_HISTORY_ITEMS; i++) {
    const entry = normalizeHistoryEntry(parsed[i]);
    if (entry) {
      history.push(entry);
    }
  }
  return history;
}

function formatHistoryDate(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('pt-BR') + ' ' +
    date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Criar um item do histórico com APIs seguras (textContent)
function createHistoryItem(item) {
  const itemElement = document.createElement('div');
  itemElement.className = 'history-item';

  const statsElement = document.createElement('span');

  const ppmValue = document.createElement('strong');
  ppmValue.textContent = String(item.ppm);

  const accuracyValue = document.createElement('strong');
  accuracyValue.textContent = item.accuracy + '%';

  statsElement.appendChild(ppmValue);
  statsElement.appendChild(document.createTextNode(' PPM | '));
  statsElement.appendChild(accuracyValue);
  statsElement.appendChild(document.createTextNode(
    ' precisão | ' + item.charactersTyped + ' chars'
  ));

  const dateElement = document.createElement('span');
  dateElement.textContent = formatHistoryDate(item.date);

  itemElement.appendChild(statsElement);
  itemElement.appendChild(dateElement);
  return itemElement;
}

// Carregar histórico na tela
function loadHistory() {
  if (!historyList) return;

  const history = getHistory();

  if (history.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = 'Nenhum teste ainda.';
    historyList.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  history.forEach((item) => {
    fragment.appendChild(createHistoryItem(item));
  });
  historyList.replaceChildren(fragment);
}

// Limpar histórico
function clearHistory() {
  removeStorage(STORAGE_KEY);
  loadHistory();
}

// Processar a digitação e atualizar os indicadores
function handleTypingInput(value) {
  if (!testActive) return;

  if (!timerStarted && value.length > 0) {
    startTimer();
  }

  currentInput = value;
  totalCharsTyped = value.length;

  let correct = 0;
  let incorrect = 0;
  for (let i = 0; i < value.length; i++) {
    if (i < currentText.length && value[i] === currentText[i]) {
      correct++;
    } else {
      incorrect++;
    }
  }
  correctChars = correct;
  incorrectChars = incorrect;

  updateTextDisplay();
  updateStats();

  if (currentText.length > 0 && currentInput.length >= currentText.length) {
    scheduleCompletion();
  } else {
    clearCompletionTimeout();
  }
}

// Event Listeners
if (startBtn) {
  startBtn.addEventListener('click', startTest);
}

if (cancelBtn) {
  cancelBtn.addEventListener('click', cancelTest);
}

if (typingInput) {
  typingInput.addEventListener('input', (event) => {
    handleTypingInput(event.target.value);
  });

  // Prevenir colagem
  typingInput.addEventListener('paste', (event) => {
    event.preventDefault();
  });
}

if (restartBtn) {
  restartBtn.addEventListener('click', returnToSetup);
}

if (backToSetupBtn) {
  backToSetupBtn.addEventListener('click', returnToSetup);
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', clearHistory);
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
});
