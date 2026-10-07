/* ========================================
   EconQuiz - Trắc Nghiệm Nguyên Lý Kinh Tế
   Main Application Logic
   ======================================== */

// ==========================================
// GLOBAL STATE
// ==========================================
let quizData = null;
let currentPage = 'home';
let currentQuiz = null;
let timerInterval = null;
let elapsedSeconds = 0;

// Chapter icons and colors
const CHAPTER_THEMES = [
    { icon: '📘', color: 'ch1', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)' },
    { icon: '📗', color: 'ch2', gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)' },
    { icon: '📙', color: 'ch3', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
    { icon: '📕', color: 'ch4', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
    { icon: '📓', color: 'ch5', gradient: 'linear-gradient(135deg, #ef4444, #f87171)' },
    { icon: '📔', color: 'ch6', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
];

// ==========================================
// DATA LOADING
// ==========================================
async function loadQuizData() {
    try {
        const response = await fetch('data/questions.json');
        quizData = await response.json();
        initApp();
    } catch (err) {
        console.error('Failed to load quiz data:', err);
        showToast('Không thể tải dữ liệu câu hỏi', 'error');
    }
}

// ==========================================
// APP INITIALIZATION
// ==========================================
function initApp() {
    renderHome();
    renderPracticeSelect();
    renderAnswersPage();
    renderHistoryPage();
    setupNavigation();
    
    // Check URL hash for initial page
    const hash = window.location.hash.replace('#', '');
    if (hash && ['home', 'practice', 'answers', 'history'].includes(hash)) {
        navigateTo(hash);
    }
}

// ==========================================
// NAVIGATION
// ==========================================
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            navigateTo(btn.dataset.page);
        });
    });

    document.getElementById('logo').addEventListener('click', () => {
        navigateTo('home');
    });
}

function navigateTo(page) {
    // Reset quiz state when leaving practice
    if (currentPage === 'practice' && page !== 'practice') {
        stopTimer();
    }

    currentPage = page;
    window.location.hash = page;

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    // Update pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) targetPage.classList.add('active');

    // Refresh dynamic pages
    if (page === 'history') renderHistoryPage();
    if (page === 'home') renderHome();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// HOME PAGE
// ==========================================
function renderHome() {
    if (!quizData) return;

    const history = getHistory();
    const totalAttempts = history.length;
    const avgScore = totalAttempts > 0
        ? Math.round(history.reduce((s, h) => s + h.scorePercent, 0) / totalAttempts)
        : 0;
    const bestScore = totalAttempts > 0
        ? Math.max(...history.map(h => h.scorePercent))
        : 0;

    // Stats Grid
    document.getElementById('stats-grid').innerHTML = `
        <div class="stat-card">
            <div class="stat-icon purple">📝</div>
            <div class="stat-value">${quizData.totalQuestions}</div>
            <div class="stat-label">Tổng câu hỏi</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon cyan">📚</div>
            <div class="stat-value">${quizData.chapters.length}</div>
            <div class="stat-label">Chương</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon green">🎯</div>
            <div class="stat-value">${avgScore}%</div>
            <div class="stat-label">Điểm trung bình</div>
        </div>
        <div class="stat-card">
            <div class="stat-icon amber">🏆</div>
            <div class="stat-value">${bestScore}%</div>
            <div class="stat-label">Điểm cao nhất</div>
        </div>
    `;

    // Chapters Grid
    document.getElementById('chapters-grid').innerHTML = quizData.chapters.map((ch, i) => {
        const theme = CHAPTER_THEMES[i] || CHAPTER_THEMES[0];
        const chapterHistory = history.filter(h => h.chapterId === ch.id);
        const bestChapter = chapterHistory.length > 0
            ? Math.max(...chapterHistory.map(h => h.scorePercent))
            : 0;

        return `
            <div class="chapter-card" onclick="startQuiz(${ch.id})">
                <div class="chapter-card-header">
                    <div class="chapter-num ${theme.color}">${ch.id}</div>
                    <div class="chapter-questions-count">${ch.questions.length} câu</div>
                </div>
                <div class="chapter-card-title">${ch.title}</div>
                <div class="chapter-card-footer">
                    <div class="chapter-progress">
                        <div class="chapter-progress-bar">
                            <div class="chapter-progress-fill" style="width: ${bestChapter}%"></div>
                        </div>
                        <div class="chapter-progress-text">Cao nhất: ${bestChapter}%</div>
                    </div>
                    <button class="chapter-card-btn">Ôn tập →</button>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// PRACTICE PAGE
// ==========================================
function renderPracticeSelect() {
    if (!quizData) return;

    document.getElementById('chapter-select-grid').innerHTML = quizData.chapters.map((ch, i) => {
        const theme = CHAPTER_THEMES[i] || CHAPTER_THEMES[0];
        return `
            <div class="chapter-select-card" onclick="startQuiz(${ch.id})">
                <div class="chapter-select-icon" style="background: ${theme.gradient}; color: white;">
                    ${theme.icon}
                </div>
                <div class="chapter-select-title">Chương ${ch.id}: ${ch.title}</div>
                <div class="chapter-select-meta">
                    <span>📝 ${ch.questions.length} câu hỏi</span>
                    <span>⏱️ ~${Math.ceil(ch.questions.length * 1.5)} phút</span>
                </div>
            </div>
        `;
    }).join('');
}

function startQuiz(chapterId) {
    navigateTo('practice');

    const chapter = quizData.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    currentQuiz = {
        chapterId,
        chapterTitle: `Chương ${chapterId}: ${chapter.title}`,
        questions: chapter.questions,
        answers: {},
        startTime: Date.now()
    };

    // Show quiz area, hide select
    document.getElementById('practice-select').classList.add('hidden');
    document.getElementById('quiz-area').classList.remove('hidden');
    document.getElementById('quiz-results').classList.add('hidden');

    // Set header
    document.getElementById('quiz-chapter-title').textContent = currentQuiz.chapterTitle;
    updateQuizProgress();

    // Start timer
    startTimer();

    // Render questions
    renderQuizQuestions();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderQuizQuestions() {
    const container = document.getElementById('quiz-questions');
    container.innerHTML = currentQuiz.questions.map((q, idx) => `
        <div class="question-card" id="qcard-${idx}" data-index="${idx}">
            <div class="question-number">
                <span class="q-badge">Câu ${q.id}</span>
            </div>
            <div class="question-text">${q.text}</div>
            ${q.image ? `<div class="question-image" style="margin: 15px 0; text-align: center;"><img src="${q.image}" alt="Hình ảnh câu hỏi" style="max-width: 100%; max-height: 300px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"></div>` : ''}
            <div class="options-list">
                ${q.options.map(opt => `
                    <div class="option-item" id="opt-${idx}-${opt.letter}" 
                         onclick="selectOption(${idx}, '${opt.letter}')">
                        <div class="option-letter">${opt.letter}</div>
                        <div class="option-text">${opt.text}</div>
                    </div>
                `).join('')}
            </div>
            <div class="explanation" id="explain-${idx}">
                ${q.explanationHTML ? q.explanationHTML : `<span class="explanation-label">💡 Giải thích:</span> ${q.explanation || ''}`}
            </div>
        </div>
    `).join('');

    // Show submit button
    document.getElementById('quiz-footer').classList.remove('hidden');
}

function selectOption(questionIndex, letter) {
    // If already submitted, ignore
    if (currentQuiz.submitted) return;

    const prevAnswer = currentQuiz.answers[questionIndex];

    // Remove previous selection
    if (prevAnswer) {
        const prevEl = document.getElementById(`opt-${questionIndex}-${prevAnswer}`);
        if (prevEl) prevEl.classList.remove('selected');
    }

    // Set new selection
    currentQuiz.answers[questionIndex] = letter;
    const el = document.getElementById(`opt-${questionIndex}-${letter}`);
    if (el) el.classList.add('selected');

    // Update card style
    document.getElementById(`qcard-${questionIndex}`).classList.add('answered');

    // Update progress
    updateQuizProgress();
}

function updateQuizProgress() {
    const total = currentQuiz.questions.length;
    const answered = Object.keys(currentQuiz.answers).length;
    const percent = total > 0 ? (answered / total * 100) : 0;

    document.getElementById('quiz-progress-text').textContent = `${answered}/${total}`;
    document.getElementById('quiz-progress-fill').style.width = `${percent}%`;
}

function submitQuiz() {
    const total = currentQuiz.questions.length;
    const answered = Object.keys(currentQuiz.answers).length;

    if (answered < total) {
        const unanswered = total - answered;
        if (!confirm(`Bạn còn ${unanswered} câu chưa trả lời. Bạn có chắc muốn nộp bài?`)) {
            return;
        }
    }

    stopTimer();
    currentQuiz.submitted = true;

    // Calculate score
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    currentQuiz.questions.forEach((q, idx) => {
        const userAnswer = currentQuiz.answers[idx];
        const card = document.getElementById(`qcard-${idx}`);

        if (!userAnswer) {
            unanswered++;
            // Show correct answer
            q.options.forEach(opt => {
                const optEl = document.getElementById(`opt-${idx}-${opt.letter}`);
                optEl.classList.add('disabled');
                if (opt.letter === q.correctAnswer) {
                    optEl.classList.add('correct-answer');
                }
            });
        } else if (userAnswer === q.correctAnswer) {
            correct++;
            card.classList.add('correct');
            document.getElementById(`opt-${idx}-${userAnswer}`).classList.add('correct-answer');
            // Disable options
            q.options.forEach(opt => {
                document.getElementById(`opt-${idx}-${opt.letter}`).classList.add('disabled');
            });
        } else {
            wrong++;
            card.classList.add('incorrect');
            document.getElementById(`opt-${idx}-${userAnswer}`).classList.add('wrong-answer');
            // Show correct
            q.options.forEach(opt => {
                const optEl = document.getElementById(`opt-${idx}-${opt.letter}`);
                optEl.classList.add('disabled');
                if (opt.letter === q.correctAnswer) {
                    optEl.classList.add('correct-answer');
                }
            });
        }

        // Show explanation
        document.getElementById(`explain-${idx}`).classList.add('visible');
    });

    const scorePercent = Math.round((correct / total) * 100);

    // Save to history
    saveHistory({
        id: Date.now(),
        chapterId: currentQuiz.chapterId,
        chapterTitle: currentQuiz.chapterTitle,
        date: new Date().toISOString(),
        totalQuestions: total,
        correct,
        wrong,
        unanswered,
        scorePercent,
        timeSeconds: elapsedSeconds,
        answers: { ...currentQuiz.answers }
    });

    // Show results
    showResults(correct, wrong, unanswered, total, scorePercent);

    // Hide submit button
    document.getElementById('quiz-footer').classList.add('hidden');

    // Scroll to top to see results
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showResults(correct, wrong, unanswered, total, scorePercent) {
    const isGood = scorePercent >= 60;
    const emoji = scorePercent >= 90 ? '🎉' : scorePercent >= 70 ? '😊' : scorePercent >= 50 ? '🤔' : '😢';
    const message = scorePercent >= 90 ? 'Xuất sắc! Bạn nắm vững kiến thức rồi!'
        : scorePercent >= 70 ? 'Tốt lắm! Cần ôn thêm một chút nữa.'
        : scorePercent >= 50 ? 'Khá ổn, nhưng cần cố gắng thêm!'
        : 'Cần ôn tập thêm nhiều nhé!';

    const resultsEl = document.getElementById('quiz-results');
    resultsEl.classList.remove('hidden');

    resultsEl.innerHTML = `
        <div class="result-hero ${isGood ? 'good' : 'bad'}">
            <div class="result-emoji">${emoji}</div>
            <div class="result-score ${isGood ? 'good' : 'bad'}">${scorePercent}%</div>
            <div class="result-subtitle">${message}</div>
            <div class="result-details">
                <div class="result-detail-item">
                    <div class="result-detail-value green">${correct}</div>
                    <div class="result-detail-label">Đúng</div>
                </div>
                <div class="result-detail-item">
                    <div class="result-detail-value red">${wrong}</div>
                    <div class="result-detail-label">Sai</div>
                </div>
                <div class="result-detail-item">
                    <div class="result-detail-value blue">${unanswered}</div>
                    <div class="result-detail-label">Chưa trả lời</div>
                </div>
                <div class="result-detail-item">
                    <div class="result-detail-value" style="color: var(--accent-secondary)">${formatTime(elapsedSeconds)}</div>
                    <div class="result-detail-label">Thời gian</div>
                </div>
            </div>
            <div class="result-actions">
                <button class="btn btn-primary" onclick="startQuiz(${currentQuiz.chapterId})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                    Làm lại
                </button>
                <button class="btn btn-glass" onclick="backToChapterSelect()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                    Chọn chương khác
                </button>
                <button class="btn btn-glass" onclick="scrollToQuestions()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                    Xem chi tiết
                </button>
            </div>
        </div>
    `;

    showToast(`Đã nộp bài! Điểm: ${scorePercent}%`, isGood ? 'success' : 'info');
}

function scrollToQuestions() {
    const el = document.getElementById('quiz-questions');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function backToChapterSelect() {
    stopTimer();
    currentQuiz = null;

    document.getElementById('practice-select').classList.remove('hidden');
    document.getElementById('quiz-area').classList.add('hidden');
    document.getElementById('quiz-results').classList.add('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// TIMER
// ==========================================
function startTimer() {
    stopTimer();
    elapsedSeconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        elapsedSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    document.getElementById('timer-display').textContent = formatTime(elapsedSeconds);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ==========================================
// ANSWERS PAGE
// ==========================================
function renderAnswersPage() {
    if (!quizData) return;

    // Render filter buttons
    const filterContainer = document.getElementById('answers-filter');
    const existingButtons = filterContainer.querySelectorAll('[data-chapter]:not([data-chapter="all"])');
    existingButtons.forEach(b => b.remove());

    quizData.chapters.forEach((ch, i) => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.chapter = ch.id;
        btn.textContent = `Chương ${ch.id}`;
        btn.onclick = () => filterAnswers(ch.id);
        filterContainer.appendChild(btn);
    });

    // Render all answers
    filterAnswers('all');
}

function filterAnswers(chapterFilter) {
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', 
            btn.dataset.chapter === String(chapterFilter));
    });

    const container = document.getElementById('answers-container');
    const chaptersToShow = chapterFilter === 'all'
        ? quizData.chapters
        : quizData.chapters.filter(c => c.id === Number(chapterFilter));

    container.innerHTML = chaptersToShow.map((ch, ci) => `
        <div class="answer-chapter-group">
            <div class="answer-chapter-title">
                ${CHAPTER_THEMES[ch.id - 1]?.icon || '📘'} Chương ${ch.id}: ${ch.title}
            </div>
            ${ch.questions.map(q => `
                <div class="answer-item">
                    <div class="answer-question-text">
                        <strong>Câu ${q.id}:</strong> ${q.text}
                    </div>
                    ${q.image ? `<div style="margin: 10px 0;"><img src="${q.image}" alt="Hình ảnh câu hỏi" style="max-width: 100%; max-height: 200px; border-radius: 8px;"></div>` : ''}
                    <div class="answer-options">
                        ${q.options.map(opt => `
                            <div class="answer-option ${opt.letter === q.correctAnswer ? 'correct' : ''}">
                                <strong>${opt.letter}.</strong> ${opt.text}
                                ${opt.letter === q.correctAnswer ? ' ✓' : ''}
                            </div>
                        `).join('')}
                    </div>
                    ${(q.explanationHTML || q.explanation) ? `
                        <div class="answer-explanation" style="${q.explanationHTML ? 'background: none; border: none; padding: 0;' : ''}">
                            ${q.explanationHTML ? q.explanationHTML : `💡 ${q.explanation}`}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `).join('');
}

// ==========================================
// HISTORY PAGE
// ==========================================
function getHistory() {
    try {
        return JSON.parse(localStorage.getItem('econquiz_history') || '[]');
    } catch {
        return [];
    }
}

function saveHistory(entry) {
    const history = getHistory();
    history.unshift(entry); // Add to beginning
    // Keep max 100 entries
    if (history.length > 100) history.pop();
    localStorage.setItem('econquiz_history', JSON.stringify(history));
}

function clearHistory() {
    if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử làm bài?')) {
        localStorage.removeItem('econquiz_history');
        renderHistoryPage();
        renderHome();
        showToast('Đã xóa lịch sử', 'success');
    }
}

function renderHistoryPage() {
    const history = getHistory();

    // Stats
    const totalAttempts = history.length;
    const avgScore = totalAttempts > 0
        ? Math.round(history.reduce((s, h) => s + h.scorePercent, 0) / totalAttempts)
        : 0;
    const bestScore = totalAttempts > 0
        ? Math.max(...history.map(h => h.scorePercent))
        : 0;
    const totalTime = history.reduce((s, h) => s + (h.timeSeconds || 0), 0);

    document.getElementById('history-stats').innerHTML = `
        <div class="history-stat-card">
            <div class="history-stat-value" style="color: var(--accent-primary-light)">${totalAttempts}</div>
            <div class="history-stat-label">Lần làm bài</div>
        </div>
        <div class="history-stat-card">
            <div class="history-stat-value" style="color: var(--accent-secondary)">${avgScore}%</div>
            <div class="history-stat-label">Điểm trung bình</div>
        </div>
        <div class="history-stat-card">
            <div class="history-stat-value" style="color: var(--accent-success)">${bestScore}%</div>
            <div class="history-stat-label">Điểm cao nhất</div>
        </div>
        <div class="history-stat-card">
            <div class="history-stat-value" style="color: var(--accent-warning)">${formatTime(totalTime)}</div>
            <div class="history-stat-label">Tổng thời gian</div>
        </div>
    `;

    // History List
    const listEl = document.getElementById('history-list');

    if (history.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">Chưa có lịch sử làm bài</div>
                <div class="empty-state-desc">Hãy bắt đầu ôn tập để xem kết quả ở đây!</div>
                <button class="btn btn-primary" style="margin-top: 20px" onclick="navigateTo('practice')">
                    Bắt đầu ôn tập
                </button>
            </div>
        `;
        return;
    }

    listEl.innerHTML = `
        <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
            <button class="btn btn-ghost btn-sm" style="color: var(--accent-danger)" onclick="clearHistory()">
                🗑️ Xóa lịch sử
            </button>
        </div>
        ${history.map(h => {
            const scoreClass = h.scorePercent >= 70 ? 'good' : h.scorePercent >= 50 ? 'mid' : 'bad';
            const date = new Date(h.date);
            const dateStr = date.toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
            const timeStr = date.toLocaleTimeString('vi-VN', {
                hour: '2-digit', minute: '2-digit'
            });

            return `
                <div class="history-item">
                    <div class="history-item-left">
                        <div class="history-score-ring ${scoreClass}">
                            ${h.scorePercent}%
                        </div>
                        <div class="history-item-info">
                            <div class="history-item-title">${h.chapterTitle}</div>
                            <div class="history-item-meta">
                                <span>📅 ${dateStr} ${timeStr}</span>
                                <span>⏱️ ${formatTime(h.timeSeconds || 0)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="history-item-right">
                        <div class="history-item-stats">
                            <div class="history-mini-stat">
                                <div class="history-mini-stat-value" style="color: var(--accent-success)">${h.correct}</div>
                                <div class="history-mini-stat-label">Đúng</div>
                            </div>
                            <div class="history-mini-stat">
                                <div class="history-mini-stat-value" style="color: var(--accent-danger)">${h.wrong}</div>
                                <div class="history-mini-stat-label">Sai</div>
                            </div>
                            <div class="history-mini-stat">
                                <div class="history-mini-stat-value" style="color: var(--text-muted)">${h.unanswered || 0}</div>
                                <div class="history-mini-stat-label">Bỏ qua</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('')}
    `;
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// INITIALIZE
// ==========================================
document.addEventListener('DOMContentLoaded', loadQuizData);
