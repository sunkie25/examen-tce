const EXAM_SIZE = 30;
const EXAM_SECONDS = 30 * 60;
const STORAGE_KEY = "tce-learning-progress-v1";

const els = {
  modeTabs: [...document.querySelectorAll(".mode-tab")],
  initial: document.getElementById("stat-initial"),
  left: document.getElementById("stat-left"),
  time: document.getElementById("stat-time"),
  correct: document.getElementById("stat-correct"),
  wrong: document.getElementById("stat-wrong"),
  modeLabel: document.getElementById("mode-label"),
  questionIndex: document.getElementById("question-index"),
  questionText: document.getElementById("question-text"),
  pdfNote: document.getElementById("pdf-note"),
  answers: document.getElementById("answers"),
  grid: document.getElementById("question-grid"),
  grade: document.getElementById("grade-preview"),
  back: document.getElementById("back-btn"),
  later: document.getElementById("later-btn"),
  change: document.getElementById("change-btn"),
  submit: document.getElementById("submit-btn"),
  next: document.getElementById("next-btn"),
  modal: document.getElementById("result-modal"),
  resultSummary: document.getElementById("result-summary"),
  restart: document.getElementById("restart-btn"),
  review: document.getElementById("review-btn"),
};

let timer = null;
let state = {
  mode: "learn",
  learnIndex: 0,
  selected: new Set(),
  revealed: false,
  learning: loadProgress(),
  exam: null,
};

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.learning));
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  const min = String(Math.floor(safe / 60)).padStart(2, "0");
  const sec = String(safe % 60).padStart(2, "0");
  return `${min} : ${sec}`;
}

function currentList() {
  return state.mode === "exam" && state.exam ? state.exam.questions : QUESTIONS;
}

function currentIndex() {
  return state.mode === "exam" && state.exam ? state.exam.index : state.learnIndex;
}

function currentQuestion() {
  return currentList()[currentIndex()];
}

function selectedArray() {
  return [...state.selected].sort();
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

function isCorrectSelection(question, selection = selectedArray()) {
  return sameSet(selection, [...question.correct].sort());
}

function gradeFromCorrect(correct) {
  return Math.min(10, 1 + correct * (9 / EXAM_SIZE));
}

function renderOptionText(target, option) {
  const imageMatch = option.text.trim().match(/^\[image=([^\]]+)\]$/);
  const imageUrl = imageMatch?.[1]?.trim();

  if (!imageUrl) {
    target.textContent = option.text;
    return;
  }

  try {
    const parsedUrl = new URL(imageUrl, window.location.href);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("Unsupported image protocol");

    const image = document.createElement("img");
    image.className = "answer-image";
    image.src = parsedUrl.href;
    image.alt = `Varianta ${option.id.toUpperCase()}`;
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => {
      const fallback = document.createElement("a");
      fallback.className = "answer-image-fallback";
      fallback.href = parsedUrl.href;
      fallback.target = "_blank";
      fallback.rel = "noopener noreferrer";
      fallback.textContent = "Deschide imaginea";
      target.replaceChildren(fallback);
    });
    target.classList.add("has-answer-image");
    target.appendChild(image);
  } catch {
    target.textContent = option.text;
  }
}

function setMode(mode) {
  state.mode = mode;
  state.selected = new Set();
  state.revealed = false;
  els.modal.classList.add("hidden");
  els.modeTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
  if (mode === "exam") startExam();
  else stopTimer();
  render();
}

function startExam(questions = shuffle(QUESTIONS).slice(0, EXAM_SIZE)) {
  stopTimer();
  state.exam = {
    questions,
    index: 0,
    startedAt: Date.now(),
    answers: {},
    status: {},
    finished: false,
  };
  timer = setInterval(() => {
    if (!state.exam || state.exam.finished) return;
    if (remainingSeconds() <= 0) finishExam();
    renderHeader();
  }, 1000);
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

function remainingSeconds() {
  if (!state.exam) return EXAM_SECONDS;
  const elapsed = Math.floor((Date.now() - state.exam.startedAt) / 1000);
  return EXAM_SECONDS - elapsed;
}

function questionStatus(question) {
  if (state.mode === "learn") return state.learning[question.id];
  return state.exam?.status[question.id];
}

function submittedCount() {
  if (!state.exam) return 0;
  return Object.keys(state.exam.status).filter((id) => state.exam.status[id] !== "flag").length;
}

function examCounts() {
  if (!state.exam) return { correct: 0, wrong: 0, left: QUESTIONS.length };
  const values = Object.values(state.exam.status);
  return {
    correct: values.filter((v) => v === "correct").length,
    wrong: values.filter((v) => v === "wrong").length,
    left: EXAM_SIZE - values.filter((v) => v === "correct" || v === "wrong").length,
  };
}

function renderHeader() {
  if (state.mode === "learn") {
    const done = Object.values(state.learning).filter(Boolean).length;
    const correct = Object.values(state.learning).filter((v) => v === "correct").length;
    const wrong = Object.values(state.learning).filter((v) => v === "wrong").length;
    els.initial.textContent = QUESTIONS.length;
    els.left.textContent = Math.max(0, QUESTIONS.length - done);
    els.time.textContent = "-- : --";
    els.correct.textContent = correct;
    els.wrong.textContent = wrong;
    els.grade.textContent = "-";
    return;
  }

  const counts = examCounts();
  els.initial.textContent = EXAM_SIZE;
  els.left.textContent = counts.left;
  els.time.textContent = formatTime(remainingSeconds());
  els.correct.textContent = counts.correct;
  els.wrong.textContent = counts.wrong;
  els.grade.textContent = gradeFromCorrect(counts.correct).toFixed(2);
}

function renderQuestion() {
  const question = currentQuestion();
  const list = currentList();
  const index = currentIndex();
  els.modeLabel.textContent = state.mode === "learn" ? "Mod invatare" : "Chestionar 30 intrebari";
  els.questionIndex.textContent = `${index + 1} / ${list.length}`;
  els.questionText.textContent = question.question;
  els.pdfNote.classList.toggle("hidden", !question.needsPdfReview);
  els.answers.innerHTML = "";

  const submitted = state.mode === "exam" && ["correct", "wrong"].includes(state.exam.status[question.id]);
  const showSolution = state.mode === "learn" && state.revealed;

  for (const option of question.options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-btn";
    button.disabled = submitted || showSolution;
    button.dataset.answer = option.id;
    if (state.selected.has(option.id)) button.classList.add("selected");
    if (showSolution && question.correct.includes(option.id)) button.classList.add("correct");
    if (showSolution && state.selected.has(option.id) && !question.correct.includes(option.id)) button.classList.add("wrong");
    button.innerHTML = `<span class="answer-letter">${option.id.toUpperCase()}</span><span class="answer-text"></span>`;
    renderOptionText(button.querySelector(".answer-text"), option);
    button.addEventListener("click", () => toggleAnswer(option.id));
    els.answers.appendChild(button);
  }

  els.back.disabled = state.mode === "exam" ? state.exam.finished : state.learnIndex === 0;
  els.later.classList.toggle("hidden", state.mode !== "exam");
  els.change.disabled = submitted || state.selected.size === 0;
  els.submit.disabled = submitted || state.selected.size === 0;
  els.next.classList.toggle("hidden", state.mode !== "learn" || !state.revealed);
  els.submit.textContent = state.mode === "learn" ? "Verifica raspunsul" : "Trimite raspunsul";
}

function renderGrid() {
  const list = currentList();
  els.grid.innerHTML = "";
  list.forEach((question, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "grid-btn";
    button.textContent = question.id;
    if (index === currentIndex()) button.classList.add("current");
    const status = questionStatus(question);
    if (status === "correct") button.classList.add("done");
    if (status === "wrong") button.classList.add("miss");
    if (status === "flag") button.classList.add("flag");
    button.addEventListener("click", () => jumpTo(index));
    els.grid.appendChild(button);
  });
}

function render() {
  renderHeader();
  renderQuestion();
  renderGrid();
}

function toggleAnswer(id) {
  if (state.selected.has(id)) state.selected.delete(id);
  else state.selected.add(id);
  renderQuestion();
}

function submitCurrent() {
  const question = currentQuestion();
  if (!question || state.selected.size === 0) return;
  const correct = isCorrectSelection(question);

  if (state.mode === "learn") {
    state.revealed = true;
    state.learning[question.id] = correct ? "correct" : "wrong";
    saveProgress();
    render();
    return;
  }

  state.exam.answers[question.id] = selectedArray();
  state.exam.status[question.id] = correct ? "correct" : "wrong";
  if (examCounts().left <= 0) finishExam();
  else moveToNextExamQuestion();
}

function moveToNextExamQuestion() {
  const list = state.exam.questions;
  const start = state.exam.index;
  for (let offset = 1; offset <= list.length; offset += 1) {
    const next = (start + offset) % list.length;
    const status = state.exam.status[list[next].id];
    if (status !== "correct" && status !== "wrong") {
      state.exam.index = next;
      state.selected = new Set(state.exam.answers[list[next].id] || []);
      render();
      return;
    }
  }
  finishExam();
}

function answerLater() {
  if (state.mode !== "exam") return;
  const question = currentQuestion();
  if (!state.exam.status[question.id]) state.exam.status[question.id] = "flag";
  state.exam.answers[question.id] = selectedArray();
  moveToNextExamQuestion();
}

function changeAnswer() {
  state.selected = new Set();
  if (state.mode === "learn") state.revealed = false;
  render();
}

function nextLearn() {
  state.learnIndex = Math.min(QUESTIONS.length - 1, state.learnIndex + 1);
  state.selected = new Set();
  state.revealed = false;
  render();
}

function previous() {
  if (state.mode === "learn") {
    state.learnIndex = Math.max(0, state.learnIndex - 1);
    state.selected = new Set();
    state.revealed = false;
  } else if (state.exam) {
    state.exam.index = Math.max(0, state.exam.index - 1);
    const question = currentQuestion();
    state.selected = new Set(state.exam.answers[question.id] || []);
  }
  render();
}

function jumpTo(index) {
  if (state.mode === "learn") {
    state.learnIndex = index;
    state.selected = new Set();
    state.revealed = false;
  } else if (state.exam) {
    state.exam.index = index;
    const question = currentQuestion();
    state.selected = new Set(state.exam.answers[question.id] || []);
  }
  render();
}

function finishExam() {
  if (!state.exam) return;
  stopTimer();
  state.exam.finished = true;
  const counts = examCounts();
  const grade = gradeFromCorrect(counts.correct);
  const passed = grade >= 5;
  els.resultSummary.textContent = `Ai raspuns corect la ${counts.correct} din ${EXAM_SIZE} intrebari. Nota finala este ${grade.toFixed(2)} (${passed ? "promovat" : "nepromovat"}). Punctaj: 1 punct din oficiu + ${(counts.correct * (9 / EXAM_SIZE)).toFixed(2)} puncte din raspunsuri.`;
  els.modal.classList.remove("hidden");
  renderHeader();
  renderGrid();
}

function reviewMistakes() {
  if (!state.exam) return;
  const wrong = state.exam.questions.filter((q) => state.exam.status[q.id] === "wrong" || state.exam.status[q.id] === "flag");
  if (wrong.length === 0) return;
  state.mode = "learn";
  state.learnIndex = QUESTIONS.findIndex((q) => q.id === wrong[0].id);
  state.selected = new Set();
  state.revealed = false;
  els.modal.classList.add("hidden");
  els.modeTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === "learn"));
  stopTimer();
  render();
}

els.modeTabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
els.submit.addEventListener("click", submitCurrent);
els.later.addEventListener("click", answerLater);
els.change.addEventListener("click", changeAnswer);
els.next.addEventListener("click", nextLearn);
els.back.addEventListener("click", previous);
els.restart.addEventListener("click", () => setMode("exam"));
els.review.addEventListener("click", reviewMistakes);

render();
