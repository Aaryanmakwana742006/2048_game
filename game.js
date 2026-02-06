const uid = () => Math.random().toString(36).slice(2, 9);
const nowISO = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const el = id => document.getElementById(id);

// ---------- Game State ----------
let size = 4;
let board = [];
let score = 0;
let bestScore = 0;
let previousBoards = [];
let previousScores = [];
let maxUndos = 20;
let target = 2048;
let allowContinue = true;
let gameWon = false;
let gameOver = false;
let aiOn = false;
let aiInterval = null;
let aiSpeed = 300;
let difficulty = 'normal';
let mode = 'single';
let currentPlayer = 1;
let soundsEnabled = true;

const colors = {
    0: '#f2f2f2',
    2: '#ace9ff',
    4: '#84d2ff',
    8: '#51a7f9',
    16: '#338de3',
    32: '#2a6cb0',
    64: '#1f4a7e',
    128: '#16345f',
    256: '#0e2143',
    512: '#0a162f',
    1024: '#051020',
    2048: '#030d16'
};

const sounds = { spawn: '', merge: '', win: '', lose: '' };

function playSound(key) { if (!soundsEnabled) return; try { let a = new Audio(sounds[key]);
        a.volume = 0.4;
        a.play().catch(() => {}); } catch (e) {} }

const ariaStatus = () => el('aria-status');

// ---------- Init ----------
window.onload = () => {
    const theme = localStorage.getItem('theme') || 'light';
    setTheme(theme);
    bestScore = Number(localStorage.getItem('bestScore')) || 0;
    el('best-score').textContent = bestScore;

    el('undo-btn').onclick = undoMove;
    el('restart-btn').onclick = setupGame;
    el('overlay-newgame-btn').onclick = setupGame;
    el('overlay-continue-btn').onclick = () => hideOverlay();
    el('save-btn').onclick = saveSession;
    el('ai-toggle').onclick = toggleAI;
    el('dark-toggle').onclick = toggleTheme;
    el('sound-toggle').onchange = (e) => { soundsEnabled = e.target.checked; };
    el('size-select').onchange = (e) => { size = Number(e.target.value);
        rebuildBoard();
        setupGame(); };
    el('difficulty-select').onchange = (e) => { difficulty = e.target.value; };
    el('target-select').onchange = onTargetSelect;
    el('target-custom').onchange = (e) => { let v = Number(e.target.value); if (v > 0) target = v; };
    el('mode-select').onchange = handleModeChange;
    el('new-turn-btn').onclick = newTurn;
    el('clear-leaderboard').onclick = () => { localStorage.removeItem('leaderboard');
        renderLeaderboard(); };

    document.addEventListener('keydown', globalKeyHandler);
    el('board').setAttribute('tabindex', '0');

    rebuildBoard();
    setupGame();
    renderLeaderboard();
    setupTouchControls();
    window.addEventListener('resize', resizeCanvas);
};

// ---------- Theme ----------
function setTheme(t) {
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', t);
    el('dark-toggle').textContent = (t === 'dark') ? 'Light' : 'Dark';
}

function toggleTheme() { setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }

// ---------- Target ----------
function onTargetSelect(e) {
    if (e.target.value === 'custom') { el('target-custom').style.display = 'inline-block';
        el('target-custom').focus(); } else { el('target-custom').style.display = 'none';
        target = Number(e.target.value); }
}

// ---------- Mode ----------
function handleModeChange() {
    if (mode === 'pass-and-play') { el('pass-info').style.display = 'block';
        el('new-turn-btn').style.display = 'inline-block'; } else { el('pass-info').style.display = 'none';
        el('new-turn-btn').style.display = 'none'; }
}

// ---------- Board ----------
function rebuildBoard() {
    const boardTable = el('board');
    boardTable.innerHTML = '';
    for (let r = 0; r < size; r++) {
        const tr = document.createElement('tr');
        for (let c = 0; c < size; c++) {
            const td = document.createElement('td');
            td.id = `cell-${r}-${c}`;
            td.setAttribute('role', 'gridcell');
            td.style.fontSize = `${Math.floor(48*4/size)}px`;
            tr.appendChild(td);
        }
        boardTable.appendChild(tr);
    }
    el('continue-btn').style.display = 'none';
}

// ---------- Game Setup ----------
function setupGame() {
    score = 0;
    previousBoards = [];
    previousScores = [];
    gameWon = false;
    gameOver = false;
    currentPlayer = 1;
    board = Array(size).fill(null).map(() => Array(size).fill(0));
    const spawnMap = { normal: 0.9, hard: 0.75, extreme: 0.5 };
    spawnChance = spawnMap[difficulty] || 0.9;
    addRandomTile();
    addRandomTile();
    updateScore();
    updateBoard();
    hideOverlay();
    el('restart-btn').style.display = 'inline-block';
    el('continue-btn').style.display = 'none';
    el('undo-btn').style.display = 'inline-block';
    saveGameToLocalCache();
    announce('New game started.');
}

function saveState() {
    previousBoards.push(board.map(r => r.slice()));
    previousScores.push(score);
    if (previousBoards.length > maxUndos) { previousBoards.shift();
        previousScores.shift(); }
}

function undoMove() {
    if (previousBoards.length === 0) return;
    board = previousBoards.pop();
    score = previousScores.pop();
    updateScore();
    updateBoard();
    hideOverlay();
    announce('Undo performed.');
}

// ---------- Board Update ----------
function updateScore() {
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
    }
    el('score').textContent = score;
    el('best-score').textContent = bestScore;
}


function updateBoard(changedPositions = []) {
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = el(`cell-${r}-${c}`);
            const val = board[r][c];
            cell.textContent = val === 0 ? '' : val;
            cell.style.backgroundColor = colors[val] || colors[0];
            cell.style.color = val > 4 ? '#eee' : '#555';
            cell.style.fontWeight = '700';
            cell.classList.remove('tile-new', 'tile-merge');
            const key = `${r},${c}`;
            if (changedPositions.includes(key)) cell.classList.add('tile-new');
        }
    }
    saveGameToLocalCache();
}

// ---------- Tile Manipulation ----------
function empties() { const e = []; for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
            if (board[r][c] === 0) e.push({ r, c });
    return e; }
let spawnChance = 0.9;

function addRandomTile() {
    const e = empties();
    if (e.length === 0) return null;
    const { r, c } = e[Math.floor(Math.random() * e.length)];
    const val = Math.random() < spawnChance ? 2 : 4;
    board[r][c] = val;
    playSound('spawn');
    updateBoard([`${r},${c}`]);
    return { r, c };
}

function slide(row) { const filtered = row.filter(x => x !== 0); return filtered.concat(Array(size - filtered.length).fill(0)); }

function combine(row) { for (let i = 0; i < size - 1; i++) { if (row[i] !== 0 && row[i] === row[i + 1]) { row[i] *= 2;
            row[i + 1] = 0;
            score += row[i]; } } return slide(row); }

// ---------- Moves ----------
function moveLeft() {
    let moved = false;
    let changed = [];
    for (let r = 0; r < size; r++) {
        const old = board[r].slice();
        let row = slide(old);
        for (let i = 0; i < size - 1; i++) { if (row[i] !== 0 && row[i] === row[i + 1]) { row[i] *= 2;
                row[i + 1] = 0;
                changed.push([r, i]); } }
        row = slide(row);
        for (let c = 0; c < size; c++)
            if (board[r][c] !== row[c]) moved = true;
        board[r] = row;
    }
    return { moved, changedPositions: changed.map(p => `${p[0]},${p[1]}`) };
}

function rotateBoardRows() { for (let r = 0; r < size; r++) board[r].reverse(); }

function transpose(m) { const t = Array(size).fill(null).map(() => Array(size).fill(0)); for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++) t[c][r] = m[r][c]; return t; }

function moveRight() { rotateBoardRows(); let res = moveLeft();
    rotateBoardRows();
    res.changedPositions = res.changedPositions.map(k => { const [r, c] = k.split(',').map(Number); return `${r},${size-1-c}`; }); return res; }

function moveUp() { board = transpose(board); let res = moveLeft();
    board = transpose(board);
    res.changedPositions = res.changedPositions.map(k => { const [r, c] = k.split(',').map(Number); return `${c},${r}`; }); return res; }

function moveDown() { board = transpose(board); let res = moveRight();
    board = transpose(board); return res; }

// ---------- Key Handling ----------
function handleMoveResult(result) { if (!result.moved) return false;
    saveState(); const newTile = addRandomTile(); let changed = result.changedPositions || []; if (newTile) changed.push(`${newTile.r},${newTile.c}`);
    updateBoard(changed);
    updateScore(); if (mode === 'pass-and-play') { currentPlayer = currentPlayer === 1 ? 2 : 1;
        announce(`Player ${currentPlayer}'s turn`); }
    checkPostMove(); return true; }

function handleKey(e) {
    const key = e.key;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return;
    e.preventDefault();
    let res = { moved: false, changedPositions: [] };
    if (key === "ArrowLeft") res = moveLeft();
    if (key === "ArrowRight") res = moveRight();
    if (key === "ArrowUp") res = moveUp();
    if (key === "ArrowDown") res = moveDown();
    handleMoveResult(res);
}

function globalKeyHandler(e) {
    if (e.key === 'r' || e.key === 'R') { setupGame(); return; }
    if (e.key === 'z' || e.key === 'Z') { undoMove(); return; }
    if (e.key === 'a' || e.key === 'A') { toggleAI(); return; }
    if (e.key === 'd' || e.key === 'D') { toggleTheme(); return; }
    handleKey(e);
}

// ---------- Post Move ----------
function checkPostMove() {
    if (checkWin() && !gameWon) { gameWon = true;
        playSound('win');
        showOverlay(`🎉 You reached ${target}!`);
        el('overlay-continue-btn').style.display = allowContinue ? 'inline-block' : 'none';
        saveToLeaderboard();
        runConfetti(200); } else if (checkGameOver()) { gameOver = true;
        playSound('lose');
        showOverlay('😞 Game Over!');
        saveToLeaderboard(); }
    updateScore();
}

function checkWin() { for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
            if (board[r][c] >= target) return true;
    return false; }

function canMove() { for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
            if (board[r][c] === 0) return true;
    for (let r = 0; r < size; r++)
        for (let c = 0; c < size - 1; c++)
            if (board[r][c] === board[r][c + 1]) return true;
    for (let c = 0; c < size; c++)
        for (let r = 0; r < size - 1; r++)
            if (board[r][c] === board[r + 1][c]) return true;
    return false; }

function checkGameOver() { return !canMove(); }

// ---------- Overlay ----------
function showOverlay(msg) { el('overlay-message').textContent = msg;
    el('overlay').style.display = 'flex';
    el('overlay-newgame-btn').focus();
    el('overlay-newgame-btn').style.display = 'inline-block'; if (gameWon && allowContinue) el('overlay-continue-btn').style.display = 'inline-block';
    else el('overlay-continue-btn').style.display = 'none'; if (aiOn) toggleAI(); }

function hideOverlay() { el('overlay').style.display = 'none'; }

// ---------- Leaderboard ----------
function saveToLeaderboard() {
    const lb = JSON.parse(localStorage.getItem('leaderboard') || '[]');
    lb.push({ score, date: nowISO(), size, target });
    lb.sort((a, b) => b.score - a.score);
    localStorage.setItem('leaderboard', JSON.stringify(lb.slice(0, 10)));
    renderLeaderboard();
}

function renderLeaderboard() {
    const container = el('leaderboard');
    container.innerHTML = '';
    const lb = JSON.parse(localStorage.getItem('leaderboard') || '[]');
    if (lb.length === 0) { container.textContent = 'No scores yet.'; return; }
    lb.forEach((it, i) => {
        const div = document.createElement('div');
        div.className = 'lb-item';
        div.innerHTML = `<div>#${i+1} — ${it.score}</div><div style="color:var(--muted);font-size:12px">${it.date}</div>`;
        container.appendChild(div);
    });
}

// ---------- Touch ----------
function setupTouchControls() {
    let startX, startY, endX, endY;
    const threshold = 30;
    document.addEventListener('touchstart', e => { const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY; }, { passive: true });
    document.addEventListener('touchend', e => { const t = e.changedTouches[0];
        endX = t.clientX;
        endY = t.clientY; const dx = endX - startX; const dy = endY - startY; if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return; let res = { moved: false }; if (Math.abs(dx) > Math.abs(dy)) res = dx > 0 ? moveRight() : moveLeft();
        else res = dy > 0 ? moveDown() : moveUp(); if (res.moved) handleMoveResult(res); }, { passive: true });
}

// ---------- Announce ----------
function announce(text) { if (ariaStatus()) ariaStatus().textContent = text; }

function announceUser(msg) { announce(msg); }

// ---------- AI ----------
function toggleAI() {
    aiOn = !aiOn;
    el('ai-toggle').textContent = `AI: ${aiOn?'On':'Off'}`;
    if (aiOn) aiInterval = setInterval(aiMakeMove, aiSpeed);
    else { clearInterval(aiInterval);
        aiInterval = null; }
}

function aiMakeMove() {
    const moves = [{ name: 'Left', fn: moveLeft }, { name: 'Right', fn: moveRight }, { name: 'Up', fn: moveUp }, { name: 'Down', fn: moveDown }];
    let bestScoreEval = -Infinity,
        bestMove = null;
    for (let m of moves) {
        const saveBoard = board.map(r => r.slice()),
            saveScore = score;
        const res = m.fn();
        if (!res.moved) { board = saveBoard;
            score = saveScore; continue; }
        const evalScore = evaluateBoard(board);
        board = saveBoard;
        score = saveScore;
        if (evalScore > bestScoreEval) { bestScoreEval = evalScore;
            bestMove = m; }
    }
    if (bestMove) { const res = bestMove.fn(); if (res.moved) handleMoveResult(res); } else toggleAI();
}

function evaluateBoard(b) {
    let empt = 0,
        merges = 0,
        mono = 0;
    for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
            if (b[r][c] === 0) empt++;
    for (let r = 0; r < size; r++)
        for (let c = 0; c < size - 1; c++)
            if (b[r][c] === b[r][c + 1]) merges++;
    for (let c = 0; c < size; c++)
        for (let r = 0; r < size - 1; r++)
            if (b[r][c] === b[r + 1][c]) merges++;
    for (let r = 0; r < size; r++)
        for (let c = 0; c < size - 1; c++)
            if (b[r][c] >= b[r][c + 1]) mono += b[r][c] - b[r][c + 1] > 0 ? 1 : 0;
    return empt * 1100 + merges * 600 + mono * 10 + Math.random() * 10;
}

// ---------- Confetti ----------
let confettiCanvas, confettiCtx, confettiParticles = [];

function ensureCanvas() { if (!confettiCanvas) { confettiCanvas = el('confetti-canvas');
        confettiCtx = confettiCanvas.getContext('2d');
        resizeCanvas();
        confettiCanvas.style.display = 'block'; } }

function resizeCanvas() { if (!confettiCanvas) return;
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight; }

function runConfetti(count = 150) {
    ensureCanvas();
    confettiParticles = [];
    const colors = ['#f6b26b', '#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#06a3d6'];
    for (let i = 0; i < count; i++) confettiParticles.push({ x: Math.random() * confettiCanvas.width, y: Math.random() * -confettiCanvas.height, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 6 + 2, size: Math.random() * 6 + 4, color: colors[Math.floor(Math.random() * colors.length)], rot: Math.random() * 360 });
    let t = 0;
    playConfettiFrame();

    function playConfettiFrame() { t++;
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height); for (const p of confettiParticles) { p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.05;
            confettiCtx.save();
            confettiCtx.translate(p.x, p.y);
            confettiCtx.rotate(p.rot * Math.PI / 180);
            confettiCtx.fillStyle = p.color;
            confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            confettiCtx.restore(); } if (t < 180) requestAnimationFrame(playConfettiFrame);
        else { confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            confettiCanvas.style.display = 'none'; } }
}

// ---------- Save/Load ----------
function saveSession() { const snapshot = { size, board, score, bestScore, previousBoards, previousScores, target, difficulty, mode, currentPlayer };
    localStorage.setItem('lastSession', JSON.stringify(snapshot));
    announce('Session saved.'); }

function loadSession() {
    const s = localStorage.getItem('lastSession');
    if (!s) { announce('No saved session found.'); return; }
    try {
        const snap = JSON.parse(s);
        size = snap.size || 4;
        el('size-select').value = size;
        rebuildBoard();
        board = snap.board || Array(size).fill(null).map(() => Array(size).fill(0));
        score = snap.score || 0;
        bestScore = snap.bestScore || bestScore;
        previousBoards = snap.previousBoards || [];
        previousScores = snap.previousScores || [];
        target = snap.target || target;
        difficulty = snap.difficulty || difficulty;
        mode = snap.mode || mode;
        currentPlayer = snap.currentPlayer || 1;
        el('difficulty-select').value = difficulty;
        el('target-select').value = (['1024', '2048', '4096', '8192'].includes(String(target))) ? String(target) : 'custom';
        el('target-custom').value = String(target);
        updateScore();
        updateBoard();
        announce('Session loaded.');
    } catch (e) { announce('Failed to load session.'); }
}

function saveGameToLocalCache() { const quick = { size, board, score, target, difficulty };
    localStorage.setItem('quickSave', JSON.stringify(quick)); }

// ---------- Pass-and-Play ----------
function newTurn() { announce(`Player ${currentPlayer}'s turn`); }

// ---------- Quick Restore ----------
(function quick_restore() {
    const q = localStorage.getItem('quickSave');
    if (q) { try { const snap = JSON.parse(q);
            size = snap.size || size;
            el('size-select').value = size;
            rebuildBoard();
            board = snap.board || board;
            score = snap.score || 0;
            updateScore();
            updateBoard(); } catch (e) {} }
})();