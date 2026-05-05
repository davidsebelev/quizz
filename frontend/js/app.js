const API = '/api';

let allTopics = [];
let currentTopic = null;
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let answers = [];
let selectedIndices = new Set();

window.addEventListener('DOMContentLoaded', () => { loadHome(); });

async function loadHome() {
  showScreen('screen-home');
  const grid = document.getElementById('topics-grid');
  grid.innerHTML = '<div class="loading">Loading topics…</div>';
  try {
    const res = await fetch(`${API}/topics`);
    allTopics = await res.json();
    renderTopics(allTopics);
    renderTabs(allTopics);
  } catch (e) {
    grid.innerHTML = `<div class="loading" style="color:#ef4444">⚠️ Cannot connect to server.<br>Run: <code>node backend/server.js</code></div>`;
  }
}

function renderTabs(topics) {
  const container = document.getElementById('hero-tabs');
  const lectures = [...new Set(topics.map(t => t.lecture))];
  container.innerHTML = `<button class="hero-tab active" onclick="filterTopics(null, this)">All</button>`;
  lectures.forEach(l => {
    const btn = document.createElement('button');
    btn.className = 'hero-tab';
    btn.textContent = l.toUpperCase();
    btn.onclick = () => filterTopics(l, btn);
    container.appendChild(btn);
  });
}

function filterTopics(lecture, btn) {
  document.querySelectorAll('.hero-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTopics(lecture ? allTopics.filter(t => t.lecture === lecture) : allTopics);
}

function renderTopics(topics) {
  const grid = document.getElementById('topics-grid');
  if (!topics.length) { grid.innerHTML = '<div class="loading">No topics found.</div>'; return; }
  grid.innerHTML = topics.map(t => `
    <div class="topic-card" onclick="startTopic('${t.id}')">
      <div class="topic-icon">${t.icon}</div>
      <div class="topic-lecture">${t.lecture}</div>
      <div class="topic-title">${t.title}</div>
      <div class="topic-footer">
        <span class="topic-count">${t.count} questions</span>
        <span class="topic-arrow">→</span>
      </div>
    </div>
  `).join('');
}

async function startTopic(topicId) {
  try {
    const res = await fetch(`${API}/topics/${topicId}`);
    currentTopic = await res.json();
    currentQuestions = shuffle([...currentTopic.questions]);
    currentIndex = 0; score = 0; answers = [];
    document.getElementById('quiz-nav-title').textContent = currentTopic.title;
    showScreen('screen-quiz');
    loadQuestion();
  } catch (e) { alert('Failed to load topic. Is the server running?'); }
}

function loadQuestion() {
  selectedIndices = new Set();
  const q = currentQuestions[currentIndex];
  const total = currentQuestions.length;
  const isMulti = q.answer.length > 1;

  document.getElementById('quiz-meta').textContent = `Question ${currentIndex + 1} of ${total}`;
  document.getElementById('progress-fill').style.width = `${(currentIndex / total) * 100}%`;
  document.getElementById('q-text').textContent = q.question;
  document.getElementById('feedback-block').style.display = 'none';
  document.getElementById('btn-next').style.display = 'none';

  const hintEl = document.getElementById('multi-hint');
  hintEl.style.display = isMulti ? 'inline-block' : 'none';
  if (isMulti) hintEl.textContent = `Select ${q.answer.length} answers`;

  const confirmBtn = document.getElementById('btn-confirm');
  confirmBtn.style.display = isMulti ? 'inline-flex' : 'none';
  if (isMulti) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = `Confirm (${q.answer.length} required)`;
    confirmBtn.onclick = () => confirmMulti(q);
  }

  const optDiv = document.getElementById('options');
  optDiv.innerHTML = '';
  q.options.forEach((optText, i) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.dataset.idx = i;
    if (isMulti) {
      btn.innerHTML = `<span class="opt-check" id="chk-${i}"></span>${optText}`;
      btn.onclick = () => toggleOption(i, q, btn);
    } else {
      btn.innerHTML = `<span class="opt-letter">${'ABCDEF'[i]}</span>${optText}`;
      btn.onclick = () => selectSingle(i, q);
    }
    optDiv.appendChild(btn);
  });
}

function selectSingle(chosenIdx, q) {
  document.querySelectorAll('.option').forEach(o => o.classList.add('disabled'));
  const correct = chosenIdx === q.answer[0];
  if (correct) score++;
  document.querySelectorAll('.option').forEach(o => {
    const idx = parseInt(o.dataset.idx);
    if (idx === q.answer[0]) o.classList.add('correct');
    else if (idx === chosenIdx && !correct) o.classList.add('wrong');
  });
  answers.push({ q: q.question, correct, correctTexts: q.answer.map(i => q.options[i]) });
  showFeedback(q, correct);
  document.getElementById('btn-next').style.display = 'inline-flex';
}

function toggleOption(idx, q, btn) {
  if (selectedIndices.has(idx)) {
    selectedIndices.delete(idx);
    btn.classList.remove('selected');
    document.getElementById(`chk-${idx}`).classList.remove('checked');
  } else {
    selectedIndices.add(idx);
    btn.classList.add('selected');
    document.getElementById(`chk-${idx}`).classList.add('checked');
  }
  const confirmBtn = document.getElementById('btn-confirm');
  const needed = q.answer.length;
  const chosen = selectedIndices.size;
  confirmBtn.disabled = chosen === 0;
  confirmBtn.textContent = chosen === 0
    ? `Confirm (${needed} required)`
    : chosen < needed ? `Confirm (${chosen}/${needed} selected)`
    : chosen === needed ? 'Confirm answers'
    : `Confirm (${chosen}/${needed} — too many!)`;
}

function confirmMulti(q) {
  document.querySelectorAll('.option').forEach(o => o.classList.add('disabled'));
  document.getElementById('btn-confirm').style.display = 'none';
  const correctSet = new Set(q.answer);
  const correct = selectedIndices.size === correctSet.size && [...selectedIndices].every(i => correctSet.has(i));
  if (correct) score++;
  document.querySelectorAll('.option').forEach(o => {
    const idx = parseInt(o.dataset.idx);
    if (correctSet.has(idx)) o.classList.add('correct');
    else if (selectedIndices.has(idx)) o.classList.add('wrong');
  });
  answers.push({ q: q.question, correct, correctTexts: q.answer.map(i => q.options[i]) });
  showFeedback(q, correct);
  document.getElementById('btn-next').style.display = 'inline-flex';
}

function showFeedback(q, correct) {
  document.getElementById('feedback-block').style.display = 'block';
  const verdict = document.getElementById('feedback-verdict');
  verdict.textContent = correct ? '✓ Correct!' : '✗ Incorrect';
  verdict.className = 'feedback-verdict ' + (correct ? 'correct' : 'wrong');
  document.getElementById('feedback-ref').innerHTML = q.slide
    ? `📖 Answer on slide <strong>${q.slide}</strong>: <a href="#">${q.reference || ''}</a>` : '';
  document.getElementById('feedback-explanation').textContent = q.explanation || '';
}

function nextQuestion() {
  currentIndex++;
  if (currentIndex >= currentQuestions.length) showResults();
  else loadQuestion();
}

function goHome() { loadHome(); }

function showResults() {
  const total = currentQuestions.length;
  const pct = Math.round((score / total) * 100);
  document.getElementById('result-pct').textContent = pct + '%';
  document.getElementById('stat-correct').textContent = score;
  document.getElementById('stat-wrong').textContent = total - score;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('result-ring').style.borderColor =
    pct >= 70 ? 'var(--green)' : pct >= 40 ? '#f59e0b' : 'var(--red)';
  document.getElementById('result-list').innerHTML = answers.map(a => `
    <div class="result-item">
      <div class="result-dot ${a.correct ? 'ok' : 'no'}">${a.correct ? '✓' : '✗'}</div>
      <div>
        <div class="result-q">${a.q}</div>
        <div class="result-a">Correct: ${a.correctTexts.join(' / ')}</div>
      </div>
    </div>
  `).join('');
  showScreen('screen-result');
}

function restartQuiz() { startTopic(currentTopic.id); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
