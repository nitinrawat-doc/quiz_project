// Initialize Particles.js
particlesJS('particles-js', {
  particles: {
    number: {
      value: 80,
      density: {
        enable: true,
        value_area: 800
      }
    },
    color: {
      value: '#ffffff'
    },
    shape: {
      type: 'circle',
      stroke: {
        width: 0,
        color: '#000000'
      }
    },
    opacity: {
      value: 0.5,
      random: false,
      anim: {
        enable: false,
        speed: 1,
        opacity_min: 0.1,
        sync: false
      }
    },
    size: {
      value: 3,
      random: true,
      anim: {
        enable: false,
        speed: 40,
        size_min: 0.1,
        sync: false
      }
    },
    line_linked: {
      enable: true,
      distance: 150,
      color: '#ffffff',
      opacity: 0.4,
      width: 1
    },
    move: {
      enable: true,
      speed: 2,
      direction: 'none',
      random: false,
      straight: false,
      out_mode: 'out',
      bounce: false,
      attract: {
        enable: false,
        rotateX: 600,
        rotateY: 1200
      }
    }
  },
  interactivity: {
    detect_on: 'canvas',
    events: {
      onhover: {
        enable: true,
        mode: 'grab'
      },
      onclick: {
        enable: true,
        mode: 'push'
      },
      resize: true
    },
    modes: {
      grab: {
        distance: 140,
        line_linked: {
          opacity: 1
        }
      },
      push: {
        particles_nb: 4
      }
    }
  },
  retina_detect: true
});

// Game Variables
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctStreak = 0;
let timer;
let timeLeft = 30;
let lifelineUsed = false;
let totalQuestions = 10;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const usernameInput = document.getElementById('username');
const categorySelect = document.getElementById('category');
const levelSelect = document.getElementById('level');
const progressBar = document.getElementById('progress-bar');
const timerCircle = document.getElementById('timer-circle');
const timeText = document.getElementById('time');
const questionNumber = document.getElementById('question-number');
const currentScoreEl = document.getElementById('current-score');
const streakCount = document.getElementById('streak-count');
const congratsMsg = document.getElementById('congrats-message');
const lifelineBtn = document.getElementById('lifeline-btn');
const finalScoreEl = document.getElementById('final-score');
const performanceRating = document.getElementById('performance-rating');
const leaderboardList = document.getElementById('leaderboard-list');

// Sound Effects (using Web Audio API)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

// Start Quiz Function
function startQuiz() {
  const username = usernameInput.value.trim();
  const category = categorySelect.value;
  const level = levelSelect.value;

  if (!username) {
    alert('⚠️ Please enter your name to continue!');
    usernameInput.focus();
    return;
  }

  // Hide start screen, show quiz screen
  startScreen.classList.remove('active');
  quizScreen.classList.add('active');
  
  // Play start sound
  playSound(523.25, 0.2);

  // Fetch questions
  fetchQuestions(category, level);
}

// Fetch Questions from API
function fetchQuestions(category, level) {
  const loadingHTML = `
    <div style="text-align: center; padding: 40px;">
      <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #ffd700;"></i>
      <p style="margin-top: 20px; font-size: 18px;">Loading questions...</p>
    </div>
  `;
  questionEl.innerHTML = loadingHTML;

  fetch(`https://opentdb.com/api.php?amount=${totalQuestions}&category=${category}&difficulty=${level}&type=multiple`)
    .then(res => {
      if (!res.ok) throw new Error('Network response not ok');
      return res.json();
    })
    .then(data => {
      if (!data.results || data.results.length === 0) {
        throw new Error('No questions found');
      }
      questions = data.results;
      currentQuestionIndex = 0;
      score = 0;
      correctStreak = 0;
      showQuestion();
    })
    .catch(err => {
      alert('❌ Failed to load questions. Please check your internet connection or try a different category.\n\nError: ' + err.message);
      console.error('Fetch Error:', err);
      location.reload();
    });
}

// Show Question
function showQuestion() {
  resetState();
  
  const question = questions[currentQuestionIndex];
  
  // Update question number
  questionNumber.textContent = `${currentQuestionIndex + 1}/${totalQuestions}`;
  
  // Update question text
  questionEl.innerHTML = decodeHTML(question.question);
  
  // Shuffle options
  const options = [...question.incorrect_answers];
  const correctIndex = Math.floor(Math.random() * 4);
  options.splice(correctIndex, 0, question.correct_answer);
  
  // Create option buttons
  options.forEach((option, index) => {
    const button = document.createElement('button');
    button.innerHTML = `<strong>${String.fromCharCode(65 + index)}.</strong> ${decodeHTML(option)}`;
    button.classList.add('option-btn');
    
    if (option === question.correct_answer) {
      button.dataset.correct = true;
    }
    
    button.addEventListener('click', selectAnswer);
    optionsEl.appendChild(button);
  });
  
  // Reset lifeline button
  lifelineBtn.disabled = false;
  lifelineUsed = false;
  
  // Start timer
  startTimer();
  updateProgressBar();
}

// Reset State
function resetState() {
  clearInterval(timer);
  timeLeft = 30;
  timeText.textContent = timeLeft;
  timerCircle.style.strokeDashoffset = 0;
  optionsEl.innerHTML = '';
  congratsMsg.style.display = 'none';
}

// Select Answer
function selectAnswer(e) {
  const selectedBtn = e.target.closest('.option-btn');
  if (!selectedBtn) return;
  
  const isCorrect = selectedBtn.dataset.correct === 'true';
  
  clearInterval(timer);
  
  // Disable all buttons
  Array.from(optionsEl.children).forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.correct === 'true') {
      btn.classList.add('correct');
    }
  });
  
  if (isCorrect) {
    selectedBtn.classList.add('correct');
    score++;
    correctStreak++;
    currentScoreEl.textContent = score;
    streakCount.textContent = correctStreak;
    
    // Play correct sound
    playSound(659.25, 0.2);
    
    // Show congratulations for 3 streak
    if (correctStreak === 3) {
      congratsMsg.style.display = 'block';
      setTimeout(() => {
        congratsMsg.style.display = 'none';
      }, 2000);
    }
  } else {
    selectedBtn.classList.add('wrong');
    correctStreak = 0;
    streakCount.textContent = correctStreak;
    
    // Play wrong sound
    playSound(196.00, 0.3);
  }
  
  // Move to next question
  setTimeout(() => {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
      showQuestion();
    } else {
      endQuiz();
    }
  }, 2000);
}

// Timer Function
function startTimer() {
  const circumference = 163.36;
  
  timer = setInterval(() => {
    timeLeft--;
    timeText.textContent = timeLeft;
    
    const offset = circumference * (1 - timeLeft / 30);
    timerCircle.style.strokeDashoffset = offset;
    
    // Change color when time is running out
    if (timeLeft <= 10) {
      timerCircle.style.stroke = '#ff6b6b';
    } else {
      timerCircle.style.stroke = '#ffd700';
    }
    
    if (timeLeft <= 0) {
      clearInterval(timer);
      // Auto-select wrong answer when time runs out
      const buttons = Array.from(optionsEl.children);
      const correctBtn = buttons.find(btn => btn.dataset.correct === 'true');
      
      buttons.forEach(btn => {
        btn.disabled = true;
        if (btn === correctBtn) {
          btn.classList.add('correct');
        }
      });
      
      correctStreak = 0;
      streakCount.textContent = correctStreak;
      
      setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
          showQuestion();
        } else {
          endQuiz();
        }
      }, 2000);
    }
  }, 1000);
}

// Update Progress Bar
function updateProgressBar() {
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
  progressBar.style.width = progress + '%';
}

// Lifeline 50:50
lifelineBtn.addEventListener('click', () => {
  if (lifelineUsed) return;
  
  const buttons = Array.from(optionsEl.children);
  const correctBtn = buttons.find(btn => btn.dataset.correct === 'true');
  const incorrectBtns = buttons.filter(btn => btn !== correctBtn);
  
  // Keep one random incorrect answer
  const btnToKeep = incorrectBtns[Math.floor(Math.random() * incorrectBtns.length)];
  
  // Hide other incorrect answers
  incorrectBtns.forEach(btn => {
    if (btn !== btnToKeep) {
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
      setTimeout(() => {
        btn.style.display = 'none';
      }, 300);
    }
  });
  
  lifelineUsed = true;
  lifelineBtn.disabled = true;
  
  // Play lifeline sound
  playSound(440, 0.15);
});

// End Quiz
function endQuiz() {
  const username = usernameInput.value.trim() || 'Anonymous';
  
  // Hide quiz screen, show leaderboard
  quizScreen.classList.remove('active');
  leaderboardScreen.classList.add('active');
  
  // Calculate percentage
  const percentage = Math.round((score / totalQuestions) * 100);
  
  // Display final score
  finalScoreEl.innerHTML = `
    You scored <strong>${score}</strong> out of <strong>${totalQuestions}</strong> (${percentage}%)
  `;
  
  // Performance rating
  let rating = '';
  let emoji = '';
  
  if (percentage >= 90) {
    rating = 'Outstanding! 🌟';
    emoji = '🏆';
  } else if (percentage >= 70) {
    rating = 'Great Job! 👏';
    emoji = '⭐';
  } else if (percentage >= 50) {
    rating = 'Good Effort! 👍';
    emoji = '✅';
  } else {
    rating = 'Keep Practicing! 💪';
    emoji = '📚';
  }
  
  performanceRating.innerHTML = `${emoji} ${rating}`;
  
  // Update leaderboard
  updateLeaderboard(username, score);
}

// Update Leaderboard
function updateLeaderboard(name, finalScore) {
  // Get existing leaderboard
  let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
  
  // Add new score
  leaderboard.push({
    name: name,
    score: finalScore,
    date: new Date().toLocaleDateString()
  });
  
  // Sort by score (descending)
  leaderboard.sort((a, b) => b.score - a.score);
  
  // Keep top 5
  leaderboard = leaderboard.slice(0, 5);
  
  // Save to localStorage
  localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
  
  // Display leaderboard
  displayLeaderboard(leaderboard);
}

// Display Leaderboard
function displayLeaderboard(leaderboard) {
  leaderboardList.innerHTML = '';
  
  if (leaderboard.length === 0) {
    leaderboardList.innerHTML = '<li>No scores yet. Be the first!</li>';
    return;
  }
  
  leaderboard.forEach((entry, index) => {
    const li = document.createElement('li');
    
    let medal = '';
    if (index === 0) medal = '🥇';
    else if (index === 1) medal = '🥈';
    else if (index === 2) medal = '🥉';
    else medal = `${index + 1}.`;
    
    li.innerHTML = `
      <span>${medal} ${entry.name}</span>
      <span><strong>${entry.score}/10</strong></span>
    `;
    
    leaderboardList.appendChild(li);
  });
}

// Decode HTML Entities
function decodeHTML(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

// Make startQuiz globally accessible
window.startQuiz = startQuiz;