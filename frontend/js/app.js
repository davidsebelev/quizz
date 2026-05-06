const API = '/api';

let allTopics = [];
let currentTopic = null;
let currentQuestions = [];
let currentIndex = 0;
let score = 0;
let answers = [];
let mistakeQuestions = [];
let selectedIndices = new Set();
let selectedSingleIndex = null;
let matchingSelections = new Map();
let isMistakeReview = false;

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
    currentQuestions = prepareQuestions(currentTopic.questions);
    currentIndex = 0; score = 0; answers = []; mistakeQuestions = []; isMistakeReview = false;
    document.getElementById('quiz-nav-title').textContent = currentTopic.title;
    showScreen('screen-quiz');
    loadQuestion();
  } catch (e) { alert('Failed to load topic. Is the server running?'); }
}

function loadQuestion() {
  selectedIndices = new Set();
  selectedSingleIndex = null;
  matchingSelections = new Map();
  const q = currentQuestions[currentIndex];
  const total = currentQuestions.length;
  const isMatch = q.type === 'match';
  const isFillBlank = q.type === 'fill_blank';
  const answerIndexes = Array.isArray(q.answer) ? q.answer : [];
  const isMulti = !isMatch && !isFillBlank && answerIndexes.length > 1;

  document.getElementById('quiz-meta').textContent = `Question ${currentIndex + 1} of ${total}`;
  document.getElementById('progress-fill').style.width = `${(currentIndex / total) * 100}%`;
  document.getElementById('q-text').textContent = q.question;
  renderQuestionImage(q);
  document.getElementById('feedback-block').style.display = 'none';
  document.getElementById('btn-next').style.display = 'none';

  const hintEl = document.getElementById('multi-hint');
  hintEl.style.display = (isMulti || isMatch || isFillBlank) ? 'inline-block' : 'none';
  if (isMulti) hintEl.textContent = `Select ${answerIndexes.length} answers`;
  if (isMatch) hintEl.textContent = 'Match each item';
  if (isFillBlank) hintEl.textContent = 'Type the missing answer';

  const confirmBtn = document.getElementById('btn-confirm');
  confirmBtn.style.display = 'inline-flex';
  confirmBtn.disabled = true;
  if (isMatch) {
    confirmBtn.textContent = 'Confirm matches';
    confirmBtn.onclick = () => confirmMatching(q);
  } else if (isFillBlank) {
    confirmBtn.textContent = 'Confirm answer';
    confirmBtn.onclick = () => confirmFillBlank(q);
  } else if (isMulti) {
    confirmBtn.textContent = `Confirm (${answerIndexes.length} required)`;
    confirmBtn.onclick = () => confirmMulti(q);
  } else {
    confirmBtn.textContent = 'Confirm answer';
    confirmBtn.onclick = () => confirmSingle(q);
  }

  const optDiv = document.getElementById('options');
  optDiv.innerHTML = '';
  optDiv.className = 'options';
  if (isMatch) {
    renderMatchingOptions(q, optDiv);
    return;
  }
  if (isFillBlank) {
    renderFillBlankOption(q, optDiv);
    return;
  }

  q.options.forEach((optText, i) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.dataset.idx = i;
    if (isMulti) {
      btn.innerHTML = `<span class="opt-check" id="chk-${i}"></span>${optText}`;
      btn.onclick = () => toggleOption(i, q, btn);
    } else {
      btn.innerHTML = `<span class="opt-letter">${'ABCDEF'[i]}</span>${optText}`;
      btn.onclick = () => selectSingle(i, btn);
    }
    optDiv.appendChild(btn);
  });
}

function renderQuestionImage(q) {
  const media = document.getElementById('q-media');
  const image = document.getElementById('q-image');
  const caption = document.getElementById('q-image-caption');
  const imageSrc = q.image || q.imageUrl;

  if (!imageSrc) {
    media.style.display = 'none';
    image.removeAttribute('src');
    image.alt = '';
    caption.textContent = '';
    return;
  }

  image.src = imageSrc;
  image.alt = q.imageAlt || q.question;
  caption.textContent = q.imageCaption || '';
  caption.style.display = q.imageCaption ? 'block' : 'none';
  media.style.display = 'block';
}

function renderMatchingOptions(q, optDiv) {
  const pairs = q.pairs || [];
  const rightOptions = getMatchingChoices(q);

  optDiv.className = 'options matching-options';
  pairs.forEach((pair, i) => {
    const row = document.createElement('div');
    row.className = 'match-row';
    row.dataset.idx = i;

    const left = document.createElement('div');
    left.className = 'match-left';
    left.textContent = pair.left;

    const select = document.createElement('select');
    select.className = 'match-select';
    select.dataset.idx = i;
    select.innerHTML = '<option value="">Choose match</option>';
    rightOptions.forEach(rightText => {
      const option = document.createElement('option');
      option.value = rightText;
      option.textContent = rightText;
      select.appendChild(option);
    });
    select.onchange = () => updateMatchingSelection(i, select.value, pairs.length);

    row.append(left, select);
    optDiv.appendChild(row);
  });
}

function getMatchingChoices(q) {
  const correctChoices = (q.pairs || []).map(pair => pair.right);
  const sourceChoices = Array.isArray(q.matchOptions) && q.matchOptions.length
    ? q.matchOptions
    : Array.isArray(q.options) && q.options.length ? q.options : correctChoices;
  return shuffle([...new Set([...sourceChoices, ...correctChoices])]);
}

function renderFillBlankOption(q, optDiv) {
  optDiv.className = 'options fill-options';

  const wrapper = document.createElement('label');
  wrapper.className = 'fill-field';

  const label = document.createElement('span');
  label.className = 'fill-label';
  label.textContent = q.blankLabel || 'Your answer';

  const input = document.createElement('input');
  input.className = 'fill-input';
  input.id = 'fill-answer';
  input.type = 'text';
  input.autocomplete = 'off';
  input.placeholder = q.placeholder || 'Type here';
  input.oninput = () => {
    document.getElementById('btn-confirm').disabled = normalizeAnswer(input.value) === '';
  };
  input.onkeydown = event => {
    if (event.key === 'Enter' && normalizeAnswer(input.value) !== '') confirmFillBlank(q);
  };

  wrapper.append(label, input);
  optDiv.appendChild(wrapper);
  input.focus();
}

function confirmFillBlank(q) {
  const input = document.getElementById('fill-answer');
  const userAnswer = input.value;
  const acceptableAnswers = getFillAnswers(q);
  const normalizedUserAnswer = normalizeAnswer(userAnswer);
  const correct = acceptableAnswers.some(answer => normalizeAnswer(answer) === normalizedUserAnswer);

  input.disabled = true;
  input.parentElement.classList.add(correct ? 'correct' : 'wrong');
  document.getElementById('btn-confirm').style.display = 'none';
  if (correct) score++;

  answers.push({
    question: q,
    q: q.question,
    correct,
    correctTexts: acceptableAnswers,
  });
  showFeedback(q, correct);
  document.getElementById('btn-next').style.display = 'inline-flex';
}

function getFillAnswers(q) {
  if (Array.isArray(q.answers)) return q.answers;
  if (Array.isArray(q.answer)) return q.answer;
  if (typeof q.answer === 'string') return [q.answer];
  return [];
}

function normalizeAnswer(value) {
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
}

function updateMatchingSelection(idx, value, total) {
  if (value) matchingSelections.set(idx, value);
  else matchingSelections.delete(idx);
  document.getElementById('btn-confirm').disabled = matchingSelections.size !== total;
}

function confirmMatching(q) {
  const pairs = q.pairs || [];
  document.querySelectorAll('.match-select').forEach(select => select.disabled = true);
  document.getElementById('btn-confirm').style.display = 'none';

  let correctCount = 0;
  pairs.forEach((pair, i) => {
    const row = document.querySelector(`.match-row[data-idx="${i}"]`);
    const selected = matchingSelections.get(i);
    const isCorrect = selected === pair.right;
    if (isCorrect) correctCount++;
    row.classList.add(isCorrect ? 'correct' : 'wrong');
  });

  const correct = correctCount === pairs.length;
  if (correct) score++;
  answers.push({
    question: q,
    q: q.question,
    correct,
    correctTexts: pairs.map(pair => `${pair.left} → ${pair.right}`),
  });
  showFeedback(q, correct);
  document.getElementById('btn-next').style.display = 'inline-flex';
}

function selectSingle(chosenIdx, btn) {
  selectedSingleIndex = chosenIdx;
  document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('btn-confirm').disabled = false;
}

function confirmSingle(q) {
  const chosenIdx = selectedSingleIndex;
  if (chosenIdx === null) return;
  document.querySelectorAll('.option').forEach(o => o.classList.add('disabled'));
  document.getElementById('btn-confirm').style.display = 'none';
  const correct = chosenIdx === q.answer[0];
  if (correct) score++;
  document.querySelectorAll('.option').forEach(o => {
    const idx = parseInt(o.dataset.idx);
    if (idx === q.answer[0]) o.classList.add('correct');
    else if (idx === chosenIdx && !correct) o.classList.add('wrong');
  });
  answers.push({ question: q, q: q.question, correct, correctTexts: q.answer.map(i => q.options[i]) });
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
  answers.push({ question: q, q: q.question, correct, correctTexts: q.answer.map(i => q.options[i]) });
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
  mistakeQuestions = answers.filter(a => !a.correct).map(a => a.question);
  document.getElementById('result-pct').textContent = pct + '%';
  document.getElementById('stat-correct').textContent = score;
  document.getElementById('stat-wrong').textContent = total - score;
  document.getElementById('stat-total').textContent = total;
  document.querySelector('#screen-result .quiz-nav-title').textContent = isMistakeReview ? 'Работа над ошибками' : 'Results';
  document.querySelector('#screen-result .result-header h2').textContent = isMistakeReview ? 'Ошибки разобраны!' : 'Quiz Complete!';
  document.getElementById('result-ring').style.borderColor =
    pct >= 70 ? 'var(--green)' : pct >= 40 ? '#f59e0b' : 'var(--red)';
  document.getElementById('result-list').innerHTML = answers.map(a => `
    <div class="result-item">
      <div class="result-dot ${a.correct ? 'ok' : 'no'}">${a.correct ? '✓' : '✗'}</div>
      <div>
        <div class="result-q">${escapeHTML(a.q)}</div>
        <div class="result-a">Correct: ${a.correctTexts.map(escapeHTML).join(' / ')}</div>
      </div>
    </div>
  `).join('');
  const mistakesBtn = document.getElementById('btn-mistakes');
  mistakesBtn.style.display = mistakeQuestions.length ? 'block' : 'none';
  mistakesBtn.textContent = `Работа над ошибками (${mistakeQuestions.length})`;
  showScreen('screen-result');
}

function restartQuiz() { startTopic(currentTopic.id); }

function startMistakeReview() {
  if (!mistakeQuestions.length) return;
  currentQuestions = shuffle([...mistakeQuestions]);
  currentIndex = 0;
  score = 0;
  answers = [];
  isMistakeReview = true;
  document.getElementById('quiz-nav-title').textContent = 'Работа над ошибками';
  showScreen('screen-quiz');
  loadQuestion();
}

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

function prepareQuestions(questions) {
  const pinned = questions.filter(q => q.pinToStart);
  const regular = questions.filter(q => !q.pinToStart);
  return [...pinned, ...shuffle([...regular])];
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}
