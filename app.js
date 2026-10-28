// Textos em português por duração (progressivamente maiores)
const TEXTS_BY_DURATION = {
  15: [
    "O sol aquece a terra ao amanhecer.",
    "A chuva traz frescor após o calor.",
    "Um bom café alegra o início do dia.",
    "O vento move as folhas na praça.",
    "A paz começa com um sorriso."
  ],
  30: [
    "O sol brilha forte no céu azul e aquece a terra. A vida é feita de escolhas pequenas todos os dias.",
    "A chuva cai suave sobre as folhas e forma pequenas poças. Viajar nos ensina mais que estudar muitos livros.",
    "A persistência é a chave para alcançar qualquer objetivo. O café pela manhã traz energia para começar o dia.",
    "Aprender algo novo todos os dias nos torna mais inteligentes. A amizade verdadeira resiste ao tempo e à distância.",
    "Saber ouvir é tão importante quanto saber falar. O segredo da felicidade está em apreciar o que temos."
  ],
  60: [
    "Cada pessoa tem sua própria história e seu próprio caminho. Os sonhos nos movem e nos impulsionam para frente, mas é a dedicação diária que transforma esses sonhos em realidade. Mesmo diante das dificuldades, é importante manter a esperança e seguir em frente, pois cada passo conta na construção do nosso futuro.",
    "A vida moderna nos mantém sempre ocupados com tarefas e compromissos, mas é fundamental reservar um tempo para relaxar e refletir. Passar alguns momentos em silêncio, apreciando a natureza ou conversando com pessoas queridas, pode renovar nossas energias e nos ajudar a enxergar as coisas com mais clareza.",
    "Viajar é uma das melhores formas de aprender sobre o mundo e sobre nós mesmos. Ao conhecer novas culturas, costumes e paisagens, ampliamos nossos horizontes e desenvolvemos empatia. Essas experiências ficam gravadas na memória e enriquecem nossa visão de vida para sempre.",
    "Aprender nunca deve ter idade, pois o conhecimento nos abre portas e nos torna mais capazes de enfrentar desafios. Seja lendo um livro, praticando uma habilidade ou trocando ideias com outras pessoas, cada nova aprendizagem nos torna mais versáteis e preparados para o futuro.",
    "A gratidão é um hábito que pode transformar nossa perspectiva. Ao invés de focar no que falta, reconhecer as pequenas bênçãos do dia a dia nos traz mais paz e satisfação. Com o tempo, esse simples ato se torna uma fonte constante de felicidade."
  ],
  120: [
    "A natureza nos oferece ar puro e água limpa, mas cabe a nós preservá-los. Pequenas atitudes, como economizar recursos e reduzir o lixo, já fazem diferença.\n\nCuidar do meio ambiente é um dever de todos, hoje e para as próximas gerações.",
    "Aprender a ouvir é tão importante quanto saber falar. Um diálogo calmo pode resolver conflitos sem precisar de grandes discussões.\n\nRespeitar o outro é o primeiro passo para construir relações mais justas e duradouras.",
    "O tempo passa rápido e raramente volta. Investir em coisas que realmente importam traz mais paz do que correr atrás de tudo ao mesmo tempo.\n\nValorizar o presente é a melhor forma de construir um futuro mais tranquilo.",
    "Conhecer novas histórias amplia nossos horizontes e nos torna mais empáticos. Cada experiência ensina algo que fica para sempre conosco.\n\nViajar, ler ou conversar já são formas simples de crescer todos os dias.",
    "A gratidão transforma a maneira como vemos a vida. Ao reconhecer o que temos, ficamos mais contentes com o que já conquistamos.\n\nEsse hábito simples ajuda a enfrentar desafios com mais calma e esperança."
  ]
};

// Estado do teste
let currentText = "";
let currentInput = "";
let testDuration = 30;
let timeRemaining = 30;
let timerInterval = null;
let timerStarted = false;
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
      return parseInt(durationRadios[i].value);
    }
  }
  return 30;
}

// Selecionar texto aleatoriamente da categoria correspondente à duração
function getSelectedText() {
  const duration = getSelectedDuration();
  const texts = TEXTS_BY_DURATION[duration] || TEXTS_BY_DURATION[30];
  if (!Array.isArray(texts) || texts.length === 0) {
    return "O sol brilha forte no céu azul e aquece a terra.";
  }
  const randomIndex = Math.floor(Math.random() * texts.length);
  return texts[randomIndex];
}

// Atualizar exibição do texto com cores
function updateTextDisplay() {
  if (!currentText) return;
  
  let html = '';
  for (let i = 0; i < currentText.length; i++) {
    const char = currentText[i];
    const inputChar = currentInput[i];
    
    if (char === '\n') {
      if (i < currentInput.length && inputChar === '\n') {
        html += '<br>';
      } else if (i === currentInput.length) {
        html += '<br>';
      } else {
        html += '<br>';
      }
      continue;
    }
    if (char === '\r') {
      continue;
    }
    
    if (i < currentInput.length) {
      if (inputChar === char) {
        html += `<span class="char correct">${escapeHtml(char)}</span>`;
      } else {
        html += `<span class="char incorrect">${escapeHtml(char)}</span>`;
      }
    } else if (i === currentInput.length) {
      html += `<span class="char current">${escapeHtml(char)}</span>`;
    } else {
      html += `<span class="char untyped">${escapeHtml(char)}</span>`;
    }
  }
  
  textDisplay.innerHTML = html;
}

// Escapar HTML para segurança
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Calcular PPM
// Fórmula: (caracteres corretos ÷ 5) × (60 ÷ duração em segundos)
// Ou seja: caracteres corretos × 60 / (5 × duração)
function calculatePpm() {
  if (testDuration === 0) return 0;
  const correct = correctChars;
  const seconds = testDuration - timeRemaining;
  if (seconds === 0) return 0;
  return Math.round((correct * 60) / (5 * seconds));
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
  const ppm = calculatePpm();
  const accuracy = calculateAccuracy();
  const errors = incorrectChars;
  
  ppmEl.textContent = ppm;
  accuracyEl.textContent = accuracy + '%';
  errorsEl.textContent = errors;
}

// Iniciar cronômetro
function startTimer() {
  if (timerStarted) return;
  timerStarted = true;
  
  timerInterval = setInterval(() => {
    timeRemaining--;
    
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timerEl.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    
    updateStats();
    
    if (timeRemaining <= 0) {
      endTest();
    }
  }, 1000);
}

// Finalizar teste (concluído)
function endTest() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  if (typingInput) {
    typingInput.disabled = true;
  }
  
  const ppm = calculatePpm();
  const accuracy = calculateAccuracy();
  const errors = incorrectChars;
  const charsTyped = totalCharsTyped;
  
  resultPpm.textContent = ppm;
  resultAccuracy.textContent = accuracy + '%';
  resultChars.textContent = charsTyped;
  resultErrors.textContent = errors;
  
  saveToHistory(ppm, accuracy, charsTyped, errors);
  
  testScreen.classList.remove('active');
  resultsScreen.classList.add('active');
}

// Cancelar teste (não salva histórico)
function cancelTest() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  timerStarted = false;
  if (typingInput) {
    typingInput.disabled = true;
    typingInput.value = '';
  }
  currentInput = '';
  correctChars = 0;
  incorrectChars = 0;
  totalCharsTyped = 0;
  currentText = '';
  
  testScreen.classList.remove('active');
  setupScreen.classList.add('active');
  resultsScreen.classList.remove('active');
  
  loadHistory();
}

// Salvar no histórico (últimos 10)
function saveToHistory(ppm, accuracy, charsTyped, errors) {
  try {
    const history = getHistory();
    const result = {
      ppm: ppm,
      accuracy: accuracy,
      charactersTyped: charsTyped,
      errors: errors,
      duration: testDuration,
      date: new Date().toISOString()
    };
    history.unshift(result);
    if (history.length > 10) {
      history.splice(10);
    }
    localStorage.setItem('typeflow_history', JSON.stringify(history));
    loadHistory();
  } catch (e) {
    // Ignorar erros de localStorage
  }
}

// Obter histórico
function getHistory() {
  try {
    const data = localStorage.getItem('typeflow_history');
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// Carregar histórico na tela
function loadHistory() {
  const history = getHistory();
  
  if (!historyList) return;
  
  if (history.length === 0) {
    historyList.innerHTML = '<p class="history-empty">Nenhum teste ainda.</p>';
    return;
  }
  
  let html = '';
  history.forEach(item => {
    const date = new Date(item.date);
    const dateStr = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    html += `
      <div class="history-item">
        <span><strong>${item.ppm}</strong> PPM | <strong>${item.accuracy}%</strong> precisão | ${item.charactersTyped} chars</span>
        <span>${dateStr}</span>
      </div>
    `;
  });
  historyList.innerHTML = html;
}

// Limpar histórico
function clearHistory() {
  try {
    localStorage.removeItem('typeflow_history');
    loadHistory();
  } catch (e) {
    // Ignorar erros
  }
}

// Event Listeners
if (startBtn) {
  startBtn.addEventListener('click', () => {
    testDuration = getSelectedDuration();
    timeRemaining = testDuration;
    currentText = getSelectedText();
    currentInput = '';
    correctChars = 0;
    incorrectChars = 0;
    totalCharsTyped = 0;
    timerStarted = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    if (timerEl) timerEl.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    
    if (ppmEl) ppmEl.textContent = '0';
    if (accuracyEl) accuracyEl.textContent = '100%';
    if (errorsEl) errorsEl.textContent = '0';
    
    updateTextDisplay();
    
    if (typingInput) {
      typingInput.disabled = false;
      typingInput.value = '';
      typingInput.focus();
    }
    
    setupScreen.classList.remove('active');
    testScreen.classList.add('active');
    resultsScreen.classList.remove('active');
  });
}

// Botão cancelar
if (cancelBtn) {
  cancelBtn.addEventListener('click', () => {
    cancelTest();
  });
}

// Input de digitação
if (typingInput) {
  typingInput.addEventListener('input', (e) => {
    if (!timerStarted && e.target.value.length > 0) {
      startTimer();
    }
    
    currentInput = e.target.value;
    
    totalCharsTyped = currentInput.length;
    
    correctChars = 0;
    incorrectChars = 0;
    for (let i = 0; i < currentInput.length; i++) {
      if (i < currentText.length && currentInput[i] === currentText[i]) {
        correctChars++;
      } else if (i < currentText.length) {
        incorrectChars++;
      } else {
        incorrectChars++;
      }
    }
    
    updateTextDisplay();
    updateStats();
    
    if (currentInput.length >= currentText.length && currentText.length > 0) {
      setTimeout(() => {
        endTest();
      }, 100);
    }
  });
}

// Prevenir colagem
if (typingInput) {
  typingInput.addEventListener('paste', (e) => {
    e.preventDefault();
  });
}

// Botão reiniciar
if (restartBtn) {
  restartBtn.addEventListener('click', () => {
    resultsScreen.classList.remove('active');
    setupScreen.classList.add('active');
    loadHistory();
  });
}

// Botão voltar
if (backToSetupBtn) {
  backToSetupBtn.addEventListener('click', () => {
    resultsScreen.classList.remove('active');
    setupScreen.classList.add('active');
    loadHistory();
  });
}

// Botão limpar histórico
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', () => {
    clearHistory();
  });
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
});
