const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/photo', express.static(path.join(__dirname, '../photo')));
app.use('/photoNew', express.static(path.join(__dirname, '../photoNew')));
app.use('/photoLec3', express.static(path.join(__dirname, '../photoLec3')));
app.use('/phlec6', express.static(path.join(__dirname, '../phlec6')));
app.use('/phlec9', express.static(path.join(__dirname, '../phLec9')));
app.use('/ospf', express.static(path.join(__dirname, '../ospf')));
app.use('/lec12', express.static(path.join(__dirname, '../lec12')));

const DATA_FILE = path.join(__dirname, '../data/questions.json');

function loadData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

// GET all topics (for home screen)
app.get('/api/topics', (req, res) => {
  const data = loadData();
  const topics = data.topics.map(t => ({
    id: t.id,
    title: t.title,
    icon: t.icon,
    lecture: t.lecture,
    count: t.questions.length,
  }));
  res.json(topics);
});

// GET questions for a specific topic
app.get('/api/topics/:id', (req, res) => {
  const data = loadData();
  const topic = data.topics.find(t => t.id === req.params.id);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  res.json(topic);
});

// POST — add a new topic
app.post('/api/topics', (req, res) => {
  const data = loadData();
  const { title, icon, lecture, questions } = req.body;
  if (!title || !questions) return res.status(400).json({ error: 'title and questions are required' });

  const newTopic = {
    id: 'topic' + Date.now(),
    title,
    icon: icon || '📚',
    lecture: lecture || 'Lecture',
    questions: questions || [],
  };
  data.topics.push(newTopic);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  res.json(newTopic);
});

// PUT — update a topic
app.put('/api/topics/:id', (req, res) => {
  const data = loadData();
  const idx = data.topics.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Topic not found' });
  data.topics[idx] = { ...data.topics[idx], ...req.body };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  res.json(data.topics[idx]);
});

// DELETE — remove a topic
app.delete('/api/topics/:id', (req, res) => {
  const data = loadData();
  data.topics = data.topics.filter(t => t.id !== req.params.id);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  res.json({ success: true });
});

// Serve frontend for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`✅  Server running at http://localhost:${PORT}`);
});
