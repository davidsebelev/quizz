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
let topicCache = new Map();
let currentLecture = null;

window.addEventListener('DOMContentLoaded', () => { loadHome(); });

const vlsmPractices = [
  {
    id: 'campus',
    title: 'Practice 8 — Campus Network',
    network: '192.168.0.0/20',
    ipv6Base: '2001:db8:acad',
    vlans: [
      { id: 10, name: 'Engineering', hosts: 450, routerInterface: 'G0/0.10', pcInterface: 'NIC' },
      { id: 20, name: 'Marketing', hosts: 100, routerInterface: 'G0/0.20', pcInterface: 'NIC' },
      { id: 30, name: 'Printers', hosts: 25, routerInterface: 'G0/1.30', pcInterface: 'NIC' },
    ],
  },
  {
    id: 'branch',
    title: 'Practice 9 — Branch Office',
    network: '10.10.0.0/21',
    ipv6Base: '2001:db8:acad',
    vlans: [
      { id: 110, name: 'Staff', hosts: 700, routerInterface: 'G0/0.110', pcInterface: 'NIC' },
      { id: 120, name: 'Sales', hosts: 220, routerInterface: 'G0/0.120', pcInterface: 'NIC' },
      { id: 130, name: 'Voice', hosts: 60, routerInterface: 'G0/1.130', pcInterface: 'NIC' },
      { id: 140, name: 'Management', hosts: 14, routerInterface: 'G0/1.140', pcInterface: 'NIC' },
    ],
  },
  {
    id: 'datacenter',
    title: 'Practice 10 — Data Center Edge',
    network: '172.16.32.0/20',
    ipv6Base: '2001:db8:dc',
    vlans: [
      { id: 210, name: 'Servers', hosts: 900, routerInterface: 'G0/0.210', pcInterface: 'NIC' },
      { id: 220, name: 'Developers', hosts: 400, routerInterface: 'G0/0.220', pcInterface: 'NIC' },
      { id: 230, name: 'QA Lab', hosts: 120, routerInterface: 'G0/1.230', pcInterface: 'NIC' },
      { id: 240, name: 'Monitoring', hosts: 50, routerInterface: 'G0/1.240', pcInterface: 'NIC' },
    ],
  },
  {
    id: 'school',
    title: 'Practice 11 — School Network',
    network: '192.168.48.0/22',
    ipv6Base: '2001:db8:5c00',
    vlans: [
      { id: 310, name: 'Students', hosts: 250, routerInterface: 'G0/0.310', pcInterface: 'NIC' },
      { id: 320, name: 'Teachers', hosts: 120, routerInterface: 'G0/0.320', pcInterface: 'NIC' },
      { id: 330, name: 'Library', hosts: 58, routerInterface: 'G0/1.330', pcInterface: 'NIC' },
      { id: 340, name: 'Office', hosts: 26, routerInterface: 'G0/1.340', pcInterface: 'NIC' },
    ],
  },
  {
    id: 'enterprise',
    title: 'Practice 12 — Enterprise HQ',
    network: '10.50.0.0/20',
    ipv6Base: '2001:db8:5000',
    vlans: [
      { id: 410, name: 'Operations', hosts: 1000, routerInterface: 'G0/0.410', pcInterface: 'NIC' },
      { id: 420, name: 'Finance', hosts: 500, routerInterface: 'G0/0.420', pcInterface: 'NIC' },
      { id: 430, name: 'Support', hosts: 250, routerInterface: 'G0/1.430', pcInterface: 'NIC' },
      { id: 440, name: 'Guest', hosts: 110, routerInterface: 'G0/1.440', pcInterface: 'NIC' },
      { id: 450, name: 'Printers', hosts: 28, routerInterface: 'G0/1.450', pcInterface: 'NIC' },
    ],
  },
];

async function loadHome() {
  showScreen('screen-home');
  document.getElementById('app-title').textContent = 'Quiz App';
  document.querySelector('.hero-subtitle').textContent = 'Select a topic to practice';
  const grid = document.getElementById('topics-grid');
  grid.innerHTML = '<div class="loading">Loading topics…</div>';
  try {
    const res = await fetch(`${API}/topics`);
    allTopics = await res.json();
    renderHomeSections();
    renderTabs(allTopics);
  } catch (e) {
    grid.innerHTML = `<div class="loading" style="color:#ef4444">⚠️ Cannot connect to server.<br>Run: <code>node backend/server.js</code></div>`;
  }
}

function renderTabs(topics) {
  const container = document.getElementById('hero-tabs');
  container.innerHTML = `<button class="hero-tab active" onclick="filterTopics(null, this)">All</button>`;

  allTopics.filter(topic => isHomeTopic(topic)).forEach(topic => {
    const btn = document.createElement('button');
    btn.className = 'hero-tab';
    btn.textContent = topic.lecture.toUpperCase();
    btn.onclick = () => {
      document.querySelectorAll('.hero-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (isAttestationTopic(topic)) openAttestation(topic.id);
      else startTopic(topic.id);
    };
    container.appendChild(btn);
  });

  const vlsmBtn = document.createElement('button');
  vlsmBtn.className = 'hero-tab vlsm-tab';
  vlsmBtn.textContent = 'VLSM';
  vlsmBtn.onclick = () => openVlsmPractice(vlsmBtn);
  container.appendChild(vlsmBtn);

  const lecturesBtn = document.createElement('button');
  lecturesBtn.className = 'hero-tab lectures-tab';
  lecturesBtn.textContent = 'Lectures';
  lecturesBtn.onclick = () => openLectures(lecturesBtn);
  container.appendChild(lecturesBtn);
}

function renderHomeSections() {
  document.querySelector('.hero-subtitle').textContent = 'Select a practice mode';
  const sections = [
    ...allTopics.filter(topic => isHomeTopic(topic)),
    { id: 'vlsm-practice', title: 'VLSM', icon: '🧮', lecture: 'Practice', count: vlsmPractices.length },
    { id: 'lectures-overview', title: 'Lectures', icon: '📚', lecture: 'Answers', count: getLectures().length },
  ];
  renderTopics(sections);
}

function isHomeTopic(topic) {
  return ['attestation-1', 'attestation-2', 'final-exam'].includes(topic.id);
}

function isToolTopic(topic) {
  return ['vlsm-practice', 'lectures-overview'].includes(topic.id);
}

function filterTopics(lecture, btn) {
  document.querySelectorAll('.hero-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelector('.hero-subtitle').textContent = lecture ? 'Select a topic to practice' : 'Select a practice mode';
  if (lecture) renderTopics(allTopics.filter(t => t.lecture === lecture));
  else renderHomeSections();
}

function openVlsmPractice(btn) {
  document.querySelectorAll('.hero-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderVlsmPractice();
  showScreen('screen-vlsm');
}

function openLectures(btn) {
  document.querySelectorAll('.hero-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderLectureTabs();
  showScreen('screen-lectures');
}

function getLectures() {
  return [...new Set(allTopics.filter(topic => !isVirtualTopic(topic)).map(topic => topic.lecture))];
}

function isVirtualTopic(topic) {
  return ['attestation-1', 'attestation-2', 'final-exam'].includes(topic.id);
}

function isAttestationTopic(topic) {
  return ['attestation-1', 'attestation-2'].includes(topic.id);
}

function getAttestationTopics(attestationId) {
  if (attestationId === 'attestation-1') {
    return allTopics.filter(topic => !isVirtualTopic(topic) && /^Lecture [1-6]$/.test(topic.lecture));
  }
  if (attestationId === 'attestation-2') {
    return allTopics.filter(topic => !isVirtualTopic(topic) && !/^Lecture [1-6]$/.test(topic.lecture));
  }
  return [];
}

function openAttestation(attestationId) {
  const attestation = allTopics.find(topic => topic.id === attestationId);
  if (!attestation) return;

  document.querySelectorAll('.hero-tab').forEach(b => {
    b.classList.toggle('active', b.textContent === attestation.lecture.toUpperCase());
  });
  document.querySelector('.hero-subtitle').textContent = `${attestation.title}: select a lecture topic`;
  renderTopics(getAttestationTopics(attestationId));
}

function renderLectureTabs() {
  const tabs = document.getElementById('lecture-tabs');
  const lectures = getLectures();
  document.getElementById('lecture-count').textContent = `${lectures.length}`;
  tabs.innerHTML = lectures.map((lecture, index) => `
    <button class="lecture-tab ${index === 0 ? 'active' : ''}" onclick="selectLecture('${escapeAttr(lecture)}', this)">
      ${escapeHTML(lecture)}
    </button>
  `).join('');

  if (lectures.length) selectLecture(lectures[0], tabs.querySelector('.lecture-tab'));
  else {
    document.getElementById('lecture-title').textContent = 'No lectures';
    document.getElementById('lecture-summary').textContent = '';
    document.getElementById('lecture-content').innerHTML = '<div class="loading">No lectures found.</div>';
  }
}

async function selectLecture(lecture, btn) {
  currentLecture = lecture;
  document.querySelectorAll('.lecture-tab').forEach(tab => tab.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const lectureTopics = allTopics.filter(topic => topic.lecture === lecture);
  const totalQuestions = lectureTopics.reduce((sum, topic) => sum + topic.count, 0);
  document.getElementById('lecture-title').textContent = lecture;
  document.getElementById('lecture-summary').textContent = `${lectureTopics.length} topics · ${totalQuestions} questions`;
  const content = document.getElementById('lecture-content');
  content.innerHTML = '<div class="loading">Loading answers…</div>';

  try {
    const topics = await Promise.all(lectureTopics.map(loadTopicDetails));
    if (currentLecture !== lecture) return;
    content.innerHTML = topics.map(renderLectureTopic).join('');
  } catch (error) {
    content.innerHTML = '<div class="loading" style="color:#ef4444">Failed to load lecture answers.</div>';
  }
}

async function loadTopicDetails(topic) {
  if (topicCache.has(topic.id)) return topicCache.get(topic.id);
  const res = await fetch(`${API}/topics/${topic.id}`);
  if (!res.ok) throw new Error(`Failed to load ${topic.id}`);
  const fullTopic = await res.json();
  topicCache.set(topic.id, fullTopic);
  return fullTopic;
}

function renderLectureTopic(topic) {
  return `
    <section class="lecture-topic">
      <div class="lecture-topic-header">
        <div>
          <div class="topic-lecture">${escapeHTML(topic.lecture)}</div>
          <h3>${escapeHTML(topic.title)}</h3>
        </div>
        <span class="topic-count">${topic.questions.length} questions</span>
      </div>
      <div class="lecture-question-list">
        ${topic.questions.map((question, index) => renderLectureQuestion(question, index)).join('')}
      </div>
    </section>
  `;
}

function renderLectureQuestion(question, index) {
  const number = question.sourceNumber || index + 1;
  const imageSrc = question.image || question.imageUrl;
  return `
    <article class="lecture-question">
      <div class="lecture-question-top">
        <span class="lecture-question-number">${number}</span>
        <h4>${escapeHTML(question.question)}</h4>
      </div>
      ${imageSrc ? `
        <figure class="lecture-media">
          <img src="${escapeAttr(imageSrc)}" alt="${escapeAttr(question.imageAlt || question.question)}" />
          ${question.imageCaption ? `<figcaption>${escapeHTML(question.imageCaption)}</figcaption>` : ''}
        </figure>
      ` : ''}
      <div class="lecture-answer">
        <div class="lecture-answer-label">Correct answer</div>
        ${renderCorrectAnswer(question)}
      </div>
      ${question.explanation ? `
        <div class="lecture-explanation">
          <div class="lecture-answer-label">Explanation</div>
          <p>${escapeHTML(question.explanation)}</p>
        </div>
      ` : ''}
    </article>
  `;
}

function renderCorrectAnswer(question) {
  if (question.type === 'match') {
    return `
      <ul class="lecture-match-list">
        ${(question.pairs || []).map(pair => `
          <li><span>${escapeHTML(pair.left)}</span><strong>${escapeHTML(pair.right)}</strong></li>
        `).join('')}
      </ul>
    `;
  }

  if (question.type === 'fill_blank') {
    return `<div class="lecture-answer-text">${getFillAnswers(question).map(escapeHTML).join(' / ')}</div>`;
  }

  const answers = Array.isArray(question.answer)
    ? question.answer.map(index => question.options?.[index]).filter(Boolean)
    : [];
  return `
    <ul class="lecture-answer-list">
      ${answers.map(answer => `<li>${escapeHTML(answer)}</li>`).join('')}
    </ul>
  `;
}

function renderVlsmPractice() {
  const list = document.getElementById('vlsm-list');
  list.innerHTML = vlsmPractices.map((practice, index) => renderVlsmCard(practice, index)).join('');
}

function renderVlsmCard(practice, index) {
  const allocations = buildVlsmAllocations(practice);
  const isOpen = false;
  return `
    <section class="vlsm-panel ${isOpen ? 'open' : ''}" data-practice="${practice.id}">
      <button class="vlsm-summary" type="button" onclick="toggleVlsmPractice('${practice.id}')">
        <span class="vlsm-summary-main">
          <span class="vlsm-title-row">
            <span class="vlsm-card-title">${escapeHTML(practice.title)}</span>
            <span class="vlsm-badge">HARD</span>
          </span>
          <span class="vlsm-main-network">Main network: <strong>${escapeHTML(practice.network)}</strong></span>
          <span class="vlsm-vlans">
            ${practice.vlans.map((vlan, vlanIndex) => `<span class="vlan-chip ${getVlanColor(vlanIndex)}">VLAN ${vlan.id} ${escapeHTML(vlan.name)} — ${vlan.hosts} hosts</span>`).join('')}
          </span>
        </span>
        <span class="vlsm-chevron">›</span>
      </button>
      <div class="vlsm-body">
        <section class="vlsm-section">
          <h3>Topology</h3>
          ${renderTopology(practice)}
        </section>

        <section class="vlsm-section">
          <h3>Instructions</h3>
          <ul class="vlsm-instructions">
            <li>Use VLSM: sort VLANs by host count from largest to smallest.</li>
            <li>Choose the smallest prefix that supports each VLAN including network and broadcast addresses.</li>
            <li>Allocate subnets sequentially inside ${escapeHTML(practice.network)} without overlap.</li>
            <li>Use the first usable IPv4 as the router sub-interface and the last usable IPv4 as the PC.</li>
            <li>Use /64 IPv6 networks with the router at ::1 and the PC at ::10.</li>
          </ul>
        </section>

        <section class="vlsm-section">
          <h3>VLSM Subnet Table</h3>
          ${renderSubnetTable(practice.id, allocations)}
        </section>

        <section class="vlsm-section">
          <h3>IPv4 Address Table</h3>
          ${renderAddressTable(practice.id, 'ipv4', buildIpv4AddressRows(allocations))}
        </section>

        <section class="vlsm-section">
          <h3>IPv6 Address Table</h3>
          ${renderAddressTable(practice.id, 'ipv6', buildIpv6AddressRows(practice))}
        </section>

        <div class="vlsm-actions">
          <button class="btn-confirm" onclick="checkVlsmPractice('${practice.id}')">Check all</button>
          <button class="btn-next" onclick="showVlsmAnswers('${practice.id}')">Show all</button>
          <button class="vlsm-reset" onclick="resetVlsmPractice('${practice.id}')">Reset</button>
        </div>
        <div class="vlsm-feedback" id="vlsm-feedback-${practice.id}" aria-live="polite"></div>
      </div>
    </section>
  `;
}

function toggleVlsmPractice(practiceId) {
  document.querySelector(`[data-practice="${practiceId}"]`).classList.toggle('open');
}

function renderTopology(practice) {
  const vlans = practice.vlans;
  return `
    <div class="topology-board" aria-label="${escapeHTML(practice.title)} topology">
      <div class="line line-eng"></div>
      <div class="line line-marketing"></div>
      <div class="line line-core"></div>
      <div class="line line-printers"></div>
      <div class="topology-device pc eng-pc">
        <div class="pc-screen ${getVlanColor(0)}"></div>
        <span>${escapeHTML(vlans[0].name)} PC</span>
        <small>VLAN ${vlans[0].id}</small>
      </div>
      <div class="topology-device pc marketing-pc">
        <div class="pc-screen ${getVlanColor(1)}"></div>
        <span>${escapeHTML(vlans[1].name)} PC</span>
        <small>VLAN ${vlans[1].id}</small>
      </div>
      <div class="switch switch-left"><div class="switch-lights"></div><span>Switch0</span></div>
      <div class="router-node">
        <div class="router-shape">↔</div>
        <span>Router</span>
        <small class="router-if left">G0/0</small>
        <small class="router-if right">G0/1</small>
      </div>
      <div class="switch switch-right"><div class="switch-lights"></div><span>Switch1</span></div>
      <div class="topology-device pc printers-pc">
        <div class="pc-screen ${getVlanColor(2)}"></div>
        <span>${escapeHTML(vlans[2].name)} PC</span>
        <small>VLAN ${vlans[2].id}</small>
      </div>
    </div>
  `;
}

function renderSubnetTable(practiceId, rows) {
  return `
    <div class="vlsm-table-wrap">
      <table class="vlsm-table vlsm-subnet-table">
        <thead>
          <tr>
            <th>VLAN</th>
            <th>Hosts</th>
            <th>Network</th>
            <th>First Host</th>
            <th>Last Host</th>
            <th>Broadcast</th>
            <th>Next Subnet</th>
            <th>Show</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, rowIndex) => `
            <tr>
              <td>VLAN ${row.vlan.id} ${escapeHTML(row.vlan.name)}</td>
              <td>${row.vlan.hosts}</td>
              ${['network', 'firstHost', 'lastHost', 'broadcast', 'nextSubnet'].map(field => `
                <td>
                  <input data-vlsm="${practiceId}" data-table="subnet" data-row="${rowIndex}" data-field="${field}" placeholder="x.x.x.x${field === 'network' ? '/xx' : ''}" />
                  <div class="field-explanation"></div>
                </td>
              `).join('')}
              <td><button class="vlsm-show" onclick="showVlsmRow('${practiceId}', 'subnet', ${rowIndex})">Show</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAddressTable(practiceId, tableType, rows) {
  const isIpv4 = tableType === 'ipv4';
  return `
    <div class="vlsm-table-wrap">
      <table class="vlsm-table">
        <thead>
          <tr>
            <th>Device</th>
            <th>Interface</th>
            <th>VLAN</th>
            <th>${isIpv4 ? 'IP Address/Prefix' : 'IPv6 Address/Prefix'}</th>
            ${isIpv4 ? '<th>Subnet Mask</th>' : ''}
            <th>Default Gateway</th>
            <th>Show</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, rowIndex) => `
            <tr>
              <td>${escapeHTML(row.device)}</td>
              <td>${escapeHTML(row.iface)}</td>
              <td>${escapeHTML(row.vlan)}</td>
              <td>
                <input data-vlsm="${practiceId}" data-table="${tableType}" data-row="${rowIndex}" data-field="ip" placeholder="${isIpv4 ? 'x.x.x.x/xx' : '2001:db8::/64'}" />
                <div class="field-explanation"></div>
              </td>
              ${isIpv4 ? `
                <td>
                  <input data-vlsm="${practiceId}" data-table="${tableType}" data-row="${rowIndex}" data-field="mask" placeholder="255.x.x.x" />
                  <div class="field-explanation"></div>
                </td>` : ''}
              <td>
                <input data-vlsm="${practiceId}" data-table="${tableType}" data-row="${rowIndex}" data-field="gateway" placeholder="x.x.x.x or N/A" />
                <div class="field-explanation"></div>
              </td>
              <td><button class="vlsm-show" onclick="showVlsmRow('${practiceId}', '${tableType}', ${rowIndex})">Show</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function checkVlsmPractice(practiceId) {
  const rows = getVlsmExpectedRows(practiceId);
  let correct = 0;
  let total = 0;
  Object.keys(rows).forEach(table => {
    rows[table].forEach((row, rowIndex) => {
      Object.keys(row.answers).forEach(field => {
        total++;
        if (checkVlsmField(practiceId, table, rowIndex, field, row.answers[field], row.explanations[field])) correct++;
      });
    });
  });
  const feedback = document.getElementById(`vlsm-feedback-${practiceId}`);
  feedback.className = `vlsm-feedback ${correct === total ? 'correct' : 'wrong'}`;
  feedback.textContent = correct === total
    ? `All correct: ${correct} / ${total}`
    : `${correct} / ${total} fields correct. Wrong fields keep your answer and show explanations.`;
}

function checkVlsmField(practiceId, table, rowIndex, field, expected, explanation) {
  const input = getVlsmInput(practiceId, table, rowIndex, field);
  const helper = input.nextElementSibling;
  const isCorrect = normalizeVlsmValue(input.value) === normalizeVlsmValue(expected);
  input.classList.toggle('correct', isCorrect);
  input.classList.toggle('wrong', !isCorrect);
  helper.textContent = isCorrect ? '' : `Explanation: ${explanation} Correct answer: ${expected}`;
  return isCorrect;
}

function showVlsmAnswers(practiceId) {
  const rows = getVlsmExpectedRows(practiceId);
  Object.keys(rows).forEach(table => {
    rows[table].forEach((row, rowIndex) => {
      Object.keys(row.answers).forEach(field => {
        getVlsmInput(practiceId, table, rowIndex, field).value = row.answers[field];
      });
    });
  });
  checkVlsmPractice(practiceId);
}

function showVlsmRow(practiceId, table, rowIndex) {
  const row = getVlsmExpectedRows(practiceId)[table][rowIndex];
  Object.keys(row.answers).forEach(field => {
    getVlsmInput(practiceId, table, rowIndex, field).value = row.answers[field];
    checkVlsmField(practiceId, table, rowIndex, field, row.answers[field], row.explanations[field]);
  });
}

function resetVlsmPractice(practiceId) {
  document.querySelectorAll(`[data-vlsm="${practiceId}"]`).forEach(input => {
    input.value = '';
    input.classList.remove('correct', 'wrong');
    input.nextElementSibling.textContent = '';
  });
  const feedback = document.getElementById(`vlsm-feedback-${practiceId}`);
  feedback.className = 'vlsm-feedback';
  feedback.textContent = '';
}

function getVlsmInput(practiceId, table, rowIndex, field) {
  return document.querySelector(`[data-vlsm="${practiceId}"][data-table="${table}"][data-row="${rowIndex}"][data-field="${field}"]`);
}

function getVlsmExpectedRows(practiceId) {
  const practice = vlsmPractices.find(item => item.id === practiceId);
  const allocations = buildVlsmAllocations(practice);
  return {
    subnet: allocations.map(allocation => ({
      answers: {
        network: `${allocation.network}/${allocation.prefix}`,
        firstHost: allocation.firstHost,
        lastHost: allocation.lastHost,
        broadcast: allocation.broadcast,
        nextSubnet: allocation.nextSubnet,
      },
      explanations: buildSubnetExplanations(allocation),
    })),
    ipv4: buildIpv4AddressRows(allocations).map(row => ({
      answers: { ip: row.ip, mask: row.mask, gateway: row.gateway },
      explanations: {
        ip: row.ipExplanation,
        mask: row.maskExplanation,
        gateway: row.gatewayExplanation,
      },
    })),
    ipv6: buildIpv6AddressRows(practice).map(row => ({
      answers: { ip: row.ip, gateway: row.gateway },
      explanations: {
        ip: row.ipExplanation,
        gateway: row.gatewayExplanation,
      },
    })),
  };
}

function buildVlsmAllocations(practice) {
  let cursor = ipToNumber(practice.network.split('/')[0]);
  return [...practice.vlans]
    .sort((a, b) => b.hosts - a.hosts)
    .map(vlan => {
      const prefix = prefixForHosts(vlan.hosts);
      const blockSize = 2 ** (32 - prefix);
      const networkNum = cursor;
      const broadcastNum = networkNum + blockSize - 1;
      const allocation = {
        vlan,
        prefix,
        mask: prefixToMask(prefix),
        network: numberToIp(networkNum),
        firstHost: numberToIp(networkNum + 1),
        lastHost: numberToIp(broadcastNum - 1),
        broadcast: numberToIp(broadcastNum),
        nextSubnet: numberToIp(networkNum + blockSize),
        usableHosts: blockSize - 2,
      };
      cursor += blockSize;
      return allocation;
    });
}

function buildSubnetExplanations(allocation) {
  const rule = `VLAN ${allocation.vlan.id} needs ${allocation.vlan.hosts} hosts, so /${allocation.prefix} gives ${allocation.usableHosts} usable addresses.`;
  return {
    network: `${rule} This subnet starts at ${allocation.network}.`,
    firstHost: `First usable address is one more than the network address ${allocation.network}.`,
    lastHost: `Last usable address is one less than broadcast ${allocation.broadcast}.`,
    broadcast: `Broadcast is the last address in the /${allocation.prefix} block.`,
    nextSubnet: `Next subnet starts immediately after broadcast ${allocation.broadcast}.`,
  };
}

function buildIpv4AddressRows(allocations) {
  const rows = [];
  allocations.forEach(allocation => {
    const vlanText = `VLAN ${allocation.vlan.id}`;
    rows.push({
      device: 'Router',
      iface: allocation.vlan.routerInterface,
      vlan: vlanText,
      ip: `${allocation.firstHost}/${allocation.prefix}`,
      mask: allocation.mask,
      gateway: 'N/A',
      ipExplanation: `Router uses the first usable IPv4 address in ${allocation.network}/${allocation.prefix}.`,
      maskExplanation: `/${allocation.prefix} equals ${allocation.mask}.`,
      gatewayExplanation: 'Router interfaces do not use a default gateway in this table.',
    });
    rows.push({
      device: `${allocation.vlan.name} PC`,
      iface: allocation.vlan.pcInterface,
      vlan: vlanText,
      ip: `${allocation.lastHost}/${allocation.prefix}`,
      mask: allocation.mask,
      gateway: allocation.firstHost,
      ipExplanation: `PC uses the last usable IPv4 address before broadcast ${allocation.broadcast}.`,
      maskExplanation: `The PC is in the same /${allocation.prefix} subnet, so the mask is ${allocation.mask}.`,
      gatewayExplanation: `Default gateway is the router first usable address: ${allocation.firstHost}.`,
    });
  });
  return rows;
}

function buildIpv6AddressRows(practice) {
  const rows = [];
  practice.vlans.forEach(vlan => {
    const prefix = `${practice.ipv6Base}:${vlan.id}`;
    rows.push({
      device: 'Router',
      iface: vlan.routerInterface,
      vlan: `VLAN ${vlan.id}`,
      ip: `${prefix}::1/64`,
      gateway: 'N/A',
      ipExplanation: `Router IPv6 address uses VLAN ${vlan.id}'s /64 and host ::1.`,
      gatewayExplanation: 'Router interfaces do not use a default gateway in this table.',
    });
    rows.push({
      device: `${vlan.name} PC`,
      iface: vlan.pcInterface,
      vlan: `VLAN ${vlan.id}`,
      ip: `${prefix}::10/64`,
      gateway: `${prefix}::1`,
      ipExplanation: `PC IPv6 address uses VLAN ${vlan.id}'s /64 and host ::10.`,
      gatewayExplanation: `IPv6 default gateway is the router address ${prefix}::1.`,
    });
  });
  return rows;
}

function prefixForHosts(hosts) {
  let hostBits = 0;
  while ((2 ** hostBits) - 2 < hosts) hostBits++;
  return 32 - hostBits;
}

function ipToNumber(ip) {
  return ip.split('.').reduce((total, octet) => ((total << 8) + Number(octet)) >>> 0, 0);
}

function numberToIp(number) {
  return [24, 16, 8, 0].map(shift => (number >>> shift) & 255).join('.');
}

function prefixToMask(prefix) {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return numberToIp(mask);
}

function getVlanColor(index) {
  return ['blue', 'green', 'orange', 'purple', 'red'][index % 5];
}

function normalizeVlsmValue(value) {
  return String(value).trim().replace(/\s+/g, '').toLowerCase();
}

function renderTopics(topics) {
  const grid = document.getElementById('topics-grid');
  if (!topics.length) { grid.innerHTML = '<div class="loading">No topics found.</div>'; return; }
  grid.innerHTML = topics.map(t => `
    <div class="topic-card" onclick="${getTopicClickAction(t)}">
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

function getTopicClickAction(topic) {
  if (isAttestationTopic(topic)) return `openAttestation('${topic.id}')`;
  if (topic.id === 'vlsm-practice') return 'openVlsmPractice()';
  if (topic.id === 'lectures-overview') return 'openLectures()';
  return `startTopic('${topic.id}')`;
}

async function startTopic(topicId) {
  try {
    const res = await fetch(`${API}/topics/${topicId}`);
    currentTopic = await res.json();
    currentQuestions = prepareQuestions(currentTopic.questions);
    currentIndex = 0; score = 0; answers = []; mistakeQuestions = []; isMistakeReview = false;
    document.getElementById('quiz-nav-title').textContent = currentTopic.title;
    showScreen('screen-quiz');
    renderQuestionJump();
    loadQuestion();
  } catch (e) { alert('Failed to load topic. Is the server running?'); }
}

function renderQuestionSource(q) {
  const source = document.getElementById('q-source');
  if (!source) return;

  if (!q.sourceLecture && !q.sourceTopic) {
    source.style.display = 'none';
    source.textContent = '';
    return;
  }

  source.textContent = [q.sourceLecture, q.sourceTopic].filter(Boolean).join(' · ');
  source.style.display = 'inline-flex';
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
  renderQuestionJump();
  renderQuestionSource(q);
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
    renderAnsweredQuestion(q);
    return;
  }
  if (isFillBlank) {
    renderFillBlankOption(q, optDiv);
    renderAnsweredQuestion(q);
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
  renderAnsweredQuestion(q);
}

function renderQuestionJump() {
  const container = document.getElementById('question-jump');
  if (!container || !currentQuestions.length) return;

  container.innerHTML = currentQuestions.map((question, index) => {
    const answered = answers.find(answer => answer.question === question);
    const state = answered ? (answered.correct ? 'correct' : 'wrong') : '';
    const active = index === currentIndex ? 'active' : '';
    const label = isVirtualTopic(currentTopic) ? index + 1 : (question.sourceNumber || index + 1);
    return `
      <button class="question-jump-btn ${active} ${state}" onclick="jumpToQuestion(${index})" type="button">
        ${label}
      </button>
    `;
  }).join('');
}

function jumpToQuestion(index) {
  if (index < 0 || index >= currentQuestions.length || index === currentIndex) return;
  currentIndex = index;
  loadQuestion();
}

function getRecordedAnswer(question) {
  return answers.find(answer => answer.question === question);
}

function renderAnsweredQuestion(question) {
  const recorded = getRecordedAnswer(question);
  if (!recorded) return;

  document.getElementById('btn-confirm').style.display = 'none';
  document.getElementById('btn-next').style.display = 'inline-flex';

  if (question.type === 'match') {
    document.querySelectorAll('.match-row').forEach((row, index) => {
      row.classList.add('correct');
      const select = row.querySelector('.match-select');
      select.value = question.pairs[index].right;
      select.disabled = true;
    });
  } else if (question.type === 'fill_blank') {
    const input = document.getElementById('fill-answer');
    input.value = getFillAnswers(question)[0] || '';
    input.disabled = true;
    input.parentElement.classList.add(recorded.correct ? 'correct' : 'wrong');
  } else {
    const correctSet = new Set(question.answer || []);
    document.querySelectorAll('.option').forEach(option => {
      const index = parseInt(option.dataset.idx);
      option.classList.add('disabled');
      if (correctSet.has(index)) option.classList.add('correct');
    });
  }

  showFeedback(question, recorded.correct);
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
  renderQuestionJump();
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
  renderQuestionJump();
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
  renderQuestionJump();
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
  renderQuestionJump();
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
  if (currentIndex >= currentQuestions.length) {
    const firstUnanswered = currentQuestions.findIndex(question => !getRecordedAnswer(question));
    if (firstUnanswered === -1) showResults();
    else {
      currentIndex = firstUnanswered;
      loadQuestion();
    }
    return;
  }
  loadQuestion();
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
  renderQuestionJump();
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

function escapeAttr(value) {
  return escapeHTML(value).replace(/`/g, '&#96;');
}
