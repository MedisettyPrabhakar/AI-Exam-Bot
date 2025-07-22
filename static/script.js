let quizData = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let markedForReview = new Set();
let timerInterval;

function sendData() {
  const topic = document.getElementById("userInput").value.trim();
  const selectedRadio = document.querySelector('input[name="count"]:checked');
  const selectedCount = selectedRadio ? parseInt(selectedRadio.value) : 10;

  if (!topic) {
    document.getElementById("responseArea").innerText = "❗ Please enter a topic.";
    return;
  }

  // Hide input and show loading
  document.querySelector(".quiz-box input").style.display = "none";
  document.querySelector(".radio-group").style.display = "none";
  document.querySelector(".start-button").style.display = "none";
  document.getElementById("responseArea").innerText = "⏳ Generating your quiz...";
  

  const backendURL = window.location.origin + "/api";

fetch(backendURL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ topic, count: selectedCount })
})

    .then(response => response.json())
    .then(data => {
      quizData = data.output;
      if (!quizData.length) {
        document.getElementById("responseArea").innerText = "❌ Failed to load quiz.";
        return;
      }
      startTimer(60 * quizData.length);
      showQuestion(0);
    })
    .catch(error => {
      document.getElementById("responseArea").innerText = "❌ Error connecting to backend.";
      console.error("Error:", error);
    });
}

function showQuestion(index) {
  currentQuestionIndex = index;
  const q = quizData[index];
  let topBar = `
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
    <span><strong>Question ${index + 1} of ${quizData.length}</strong></span>
    <button type="button" class="start-button" onclick="showReviewScreen()">🧐 Review All</button>
  </div>
  `;


  let html = `<form id='quizForm'>${topBar}
    <div class="question-block">
      <p><strong>Q${index + 1}:</strong> ${q.question}</p>`;

  q.options.forEach((opt, i) => {
    const optionLetter = String.fromCharCode(65 + i);
    const checked = userAnswers[index] === optionLetter ? "checked" : "";
    html += `
      <label class="option">
        <input type="radio" name="q${index}" value="${optionLetter}" ${checked}>
        <span class="option-text">${optionLetter}) ${opt}</span>
      </label>`;
  });

  html += `</div>
    <label class='mark-review'>
      <input type='checkbox' onchange='toggleMark(${index})' ${markedForReview.has(index) ? "checked" : ""}/> Mark for Review
    </label>
    <div class="nav-buttons">`;

  // Add Prev button only if not first question
  if (index > 0) {
    html += `<button type="button" onclick="prevQuestion()">⬅️ Prev</button>`;
  } else {
  html += `<span></span>`; // empty space to align Next button
  } 

  // Add Next button only if not last question
  if (index < quizData.length - 1) {
    html += `<button type="button" onclick="nextQuestion()">Next ➡️</button>`;
  }

  html += `</div>
      <button type="submit" class="start-button">✅ Submit Exam</button>
    </div>
  </form>`;

  document.getElementById("responseArea").innerHTML = html;
  document.getElementById("quizForm").onsubmit = submitExam;

  document.querySelectorAll(`input[name='q${index}']`).forEach(radio => {
    radio.onchange = () => userAnswers[index] = radio.value;
  });
}



function prevQuestion() {
  if (currentQuestionIndex > 0) showQuestion(currentQuestionIndex - 1);
}

function nextQuestion() {
  if (currentQuestionIndex < quizData.length - 1) showQuestion(currentQuestionIndex + 1);
}

function showReviewScreen() {
  let html = `<div class="question-block"><h2>🧐 Review Your Answers</h2><ul style="list-style: none; padding-left: 0;">`;

  quizData.forEach((q, i) => {
    const attempted = userAnswers[i] ? "✅ Attempted" : "❌ Not Answered";
    html += `
      <li style="margin-bottom: 10px;">
        <strong>Q${i + 1}:</strong> ${attempted}
        <button style="margin-left: 10px;" onclick="showQuestion(${i})">Go to Question</button>
      </li>`;
  });

  html += `</ul>
    <div style="text-align: center; margin-top: 20px;">
      <button class="start-button" onclick="submitExam()">✅ Submit Exam</button>
    </div>
  </div>`;

  document.getElementById("responseArea").innerHTML = html;
}

function toggleMark(index) {
  if (markedForReview.has(index)) {
    markedForReview.delete(index);
  } else {
    markedForReview.add(index);
  }
}

function startTimer(seconds) {
  const timerDiv = document.getElementById("timer");

  function updateTimer() {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerDiv.innerText = `⏳ Time Left: ${mins}:${secs.toString().padStart(2, "0")}`;
    if (seconds-- <= 0) {
      clearInterval(timerInterval);
      submitExam();
    }
  }

  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

function submitExam(e) {
  if (e) e.preventDefault();
  clearInterval(timerInterval);

  let score = 0;
  let total = quizData.length;
  let attempted = 0;

  quizData.forEach((q, i) => {
    const correctRaw = q.answer || "";
    const correct = correctRaw.toUpperCase().replace(/ANSWER[:\-]?\s*/i, "").trim();
    const userAns = userAnswers[i];
    
    if (userAns) attempted++;
    if (userAns && userAns.toUpperCase() === correct) score++;
  });

  let resultHTML = `
    <div class="question-block">
      <h2>✅ Exam Submitted!</h2>
      <p><strong>Score:</strong> ${score} / ${total}</p>
      <p><strong>Attempted:</strong> ${attempted} / ${total}</p>
      <p><strong>Unattempted:</strong> ${total - attempted}</p>
    </div>`;

  // ➕ Marked-for-Review Summary added below the score
  if (markedForReview.size > 0) {
    resultHTML += `
      <div class="question-block">
        <h3>🔖 Marked for Review Questions</h3>`;

    markedForReview.forEach(index => {
      const q = quizData[index];
      const correct = (q.answer || "").toUpperCase().replace(/ANSWER[:\-]?\s*/i, "").trim();
      const userAns = userAnswers[index] || "Not Answered";
      const isCorrect = userAns.toUpperCase() === correct;
      const explanation = q.explanation || "Explanation not available.";
      const readMore = q.link ? `<a href="${q.link}" target="_blank">Read more →</a>` : "";

      resultHTML += `
       <div style="margin-bottom: 12px; padding: 10px; background: #f9f9f9; border-radius: 10px;">
       <p><strong>Q${index + 1}:</strong> ${q.question}</p>
       <p><strong>Your Answer:</strong> ${userAns}</p>
       <p><strong>Correct Answer:</strong> ${correct}</p>
       ${!isCorrect ? `<p><strong>💡 Explanation:</strong> ${explanation}${readMore ? ` <a href="${q.link}" target="_blank">Read more →</a>` : ""}</p>` : ""}
  </div>`;

    });

    resultHTML += `</div>`;
  }

  resultHTML += `
    <div style="text-align: center;">
      <button class="start-button" onclick="resetQuiz()">🔁 Restart Quiz</button>
    </div>`;

  document.getElementById("responseArea").innerHTML = resultHTML;
  document.getElementById("timer").innerText = "";
}



function resetQuiz() {
  quizData = [];
  userAnswers = {};
  markedForReview = new Set();
  currentQuestionIndex = 0;
  clearInterval(timerInterval);

  document.getElementById("userInput").value = "";
  document.querySelector(".quiz-box input").style.display = "block";
  document.querySelector(".radio-group").style.display = "flex";
  document.querySelector(".start-button").style.display = "inline-block";
  document.getElementById("responseArea").innerHTML = "Your quiz will appear here...";
  document.getElementById("timer").innerText = "";
}