let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctStreak = 0;
let timer;
let timeLeft = 30;
let lifelineUsed = false;
let leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];

const questionNumberEl = document.getElementById("question-number");
const lifelineBtn = document.getElementById("lifeline-btn");
const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const questionEl = document.getElementById("question");
const optionsEl = document.getElementById("options");
const usernameInput = document.getElementById("username");
const categorySelect = document.getElementById("category");
const progressBar = document.getElementById("progress-bar");
const timerCircle = document.getElementById("timer-circle");
const timeText = document.getElementById("time");
const streakMsg = document.getElementById("streak-msg");
const congratsMsg = document.getElementById("congrats-message");
const leaderboardScreen = document.getElementById("leaderboard-screen");
const leaderboardEl = document.getElementById("leaderboard-list");
const finalScoreEl = document.getElementById("final-score");
const playAgainBtn = document.getElementById("play-again");

function startQuiz() {
  const username = usernameInput.value.trim();
  const category = categorySelect.value || "9";
  const level = document.getElementById("level").value;

  if (!username) {
    alert("Please enter your name");
    return;
  }

  startScreen.style.display = "none";
  quizScreen.classList.add("fullscreen-quiz");

  fetchQuestions(category, level);
}

function fetchQuestions(category, level) {
  fetch(`https://opentdb.com/api.php?amount=10&category=${category}&difficulty=${level}&type=multiple`)
    .then(res => {
      if (!res.ok) throw new Error("Network response not ok");
      return res.json();
    })
    .then(data => {
      if (!data.results || data.results.length === 0) throw new Error("No questions found");
      questions = data.results;
      currentQuestionIndex = 0;
      score = 0;
      correctStreak = 0;
      showQuestion();
    })
    .catch(err => {
      alert("❌ Failed to load questions. Please check internet or category.\n\nError: " + err.message);
      console.error("Fetch Error:", err);
      location.reload();
    });
}

function showQuestion() {
  resetState();
  lifelineBtn.disabled = false;
  lifelineUsed = false;

  const question = questions[currentQuestionIndex];
  questionEl.innerHTML = `${currentQuestionIndex + 1}. ${decodeHTML(question.question)}`;

  const options = [...question.incorrect_answers];
  const correctIndex = Math.floor(Math.random() * 4);
  options.splice(correctIndex, 0, question.correct_answer);

  options.forEach(option => {
    const button = document.createElement("button");
    button.innerText = decodeHTML(option);
    button.classList.add("option-btn");
    if (option === question.correct_answer) {
      button.dataset.correct = true;
    }
    button.addEventListener("click", selectAnswer);
    optionsEl.appendChild(button);
  });

  startTimer();
  updateProgressBar();
}

function resetState() {
  clearInterval(timer);
  timeLeft = 30;
  timeText.textContent = timeLeft;
  optionsEl.innerHTML = "";
  streakMsg.innerText = "";
  congratsMsg.style.display = "none";
}

function selectAnswer(e) {
  const selectedBtn = e.target;
  const isCorrect = selectedBtn.dataset.correct === "true";

  if (isCorrect) {
    selectedBtn.classList.add("correct");
    score++;
    correctStreak++;
    if (correctStreak === 3) {
      congratsMsg.style.display = "block";
      setTimeout(() => {
        congratsMsg.style.display = "none";
      }, 1500);
    }
  } else {
    selectedBtn.classList.add("wrong");
    correctStreak = 0;
  }

  Array.from(optionsEl.children).forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.correct === "true") {
      btn.classList.add("correct");
    }
  });

  setTimeout(() => {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
      showQuestion();
    } else {
      endQuiz();
    }
  }, 1500);
}

function endQuiz() {
  const username = usernameInput.value.trim() || "Anonymous";
  const finalScore = score;

  let leaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];
  leaderboard.push({ name: username, score: finalScore });
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 5);
  localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
  window.location.href = "leaderboard.html";
}

function updateProgressBar() {
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  progressBar.style.width = progress + "%";
}

function startTimer() {
  timer = setInterval(() => {
    timeLeft--;
    timeText.textContent = timeLeft;
    timerCircle.style.strokeDashoffset = 125.6 * (1 - timeLeft / 30);
    if (timeLeft <= 0) {
      clearInterval(timer);
      selectAnswer({ target: { dataset: {} } });
    }
  }, 1000);
}

function decodeHTML(html) {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

function updateLeaderboard() {
  const name = usernameInput.value.trim();
  leaderboard.push({ name, score });
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 5);
  localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
  renderLeaderboard();
}

function renderLeaderboard() {
  leaderboardEl.innerHTML = "";
  leaderboard.forEach(entry => {
    const li = document.createElement("li");
    li.textContent = `${entry.name} - ${entry.score}`;
    leaderboardEl.appendChild(li);
  });
}

playAgainBtn.addEventListener("click", () => {
  leaderboardScreen.classList.add("hide");
  startScreen.classList.remove("hide");
  usernameInput.value = "";
  categorySelect.value = "9";
});

lifelineBtn.addEventListener("click", () => {
  if (lifelineUsed) return;
  const buttons = Array.from(optionsEl.children);
  const correctBtn = buttons.find(btn => btn.dataset.correct === "true");
  const incorrectBtns = buttons.filter(btn => btn !== correctBtn);
  const btnToKeep = incorrectBtns[Math.floor(Math.random() * incorrectBtns.length)];
  incorrectBtns.forEach(btn => {
    if (btn !== btnToKeep) {
      btn.style.display = "none";
    }
  });
  lifelineUsed = true;
  lifelineBtn.disabled = true;
});

window.startQuiz = startQuiz;
renderLeaderboard();
