/* ===============================
   MBHA SAPPER — sapper.js (clean)
   - no scaling hacks
   - long tap / right click flag
   - Firebase TOP-3 (kept, but hidden on mobile by CSS)
================================ */

(function() {
    // ===== DOM =====
    const boardEl = document.getElementById("sapperBoard");
    const statusEl = document.getElementById("sapperStatus");
    const scoreEl = document.getElementById("sapperScore");
    const timerEl = document.getElementById("sapperTimer");
    const btnRestart = document.getElementById("btnRestart");

    const t1n = document.getElementById("t1n");
    const t1s = document.getElementById("t1s");
    const t2n = document.getElementById("t2n");
    const t2s = document.getElementById("t2s");
    const t3n = document.getElementById("t3n");
    const t3s = document.getElementById("t3s");

    // ===== GAME CONFIG =====
    const SIZE = 10;
    const MINES = 17;

    // ===== STATE =====
    let grid = [];
    let minesSet = false;
    let gameOver = false;

    let openedCount = 0;
    let flagsCount = 0;

    let startTime = null;
    let timerId = null;

    // ===== UTIL =====
    const pad2 = (n) => String(n).padStart(2, "0");
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

    function nowMs() { return Date.now(); }

    function formatTime(ms) {
        const totalSec = Math.floor(ms / 1000);
        const mm = Math.floor(totalSec / 60);
        const ss = totalSec % 60;
        return `${pad2(mm)}:${pad2(ss)}`;
    }

    function setStatus(text) { statusEl.textContent = text; }

    function setScore(text) { scoreEl.textContent = text; }

    function stopTimer() {
        if (timerId) clearInterval(timerId);
        timerId = null;
    }

    function startTimer() {
        startTime = nowMs();
        stopTimer();
        timerId = setInterval(() => {
            timerEl.textContent = formatTime(nowMs() - startTime);
        }, 250);
    }

    function resetTimerUI() {
        timerEl.textContent = "00:00";
    }

    // ===== GRID / MINES =====
    function idx(r, c) { return r * SIZE + c; }

    function inBounds(r, c) {
        return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
    }

    function neighbors(r, c) {
        const out = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const rr = r + dr,
                    cc = c + dc;
                if (inBounds(rr, cc)) out.push([rr, cc]);
            }
        }
        return out;
    }

    function buildEmptyGrid() {
        grid = [];
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                grid.push({
                    r,
                    c,
                    mine: false,
                    open: false,
                    flag: false,
                    n: 0,
                    el: null
                });
            }
        }
    }

    function placeMines(firstR, firstC) {
        const forbidden = new Set([idx(firstR, firstC)]);
        for (const [rr, cc] of neighbors(firstR, firstC)) {
            forbidden.add(idx(rr, cc));
        }

        const available = [];
        for (let i = 0; i < grid.length; i++) {
            if (!forbidden.has(i)) available.push(i);
        }

        for (let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }

        for (let k = 0; k < MINES; k++) {
            const id = available[k];
            grid[id].mine = true;
        }

        for (const cell of grid) {
            if (cell.mine) continue;
            let count = 0;
            for (const [rr, cc] of neighbors(cell.r, cell.c)) {
                if (grid[idx(rr, cc)].mine) count++;
            }
            cell.n = count;
        }

        minesSet = true;
    }

    // ===== RENDER =====
    function clearBoardDOM() {
        while (boardEl.firstChild) boardEl.removeChild(boardEl.firstChild);
    }

    function renderBoard() {
        clearBoardDOM();
        for (const cell of grid) {
            const d = document.createElement("div");
            d.className = "sapper-cell";
            d.dataset.r = String(cell.r);
            d.dataset.c = String(cell.c);
            cell.el = d;
            boardEl.appendChild(d);
        }
    }

    function setCellClass(cell) {
        const el = cell.el;
        if (!el) return;

        el.className = "sapper-cell";
        if (cell.open) el.classList.add("open");
        if (cell.flag) el.classList.add("flag");
        if (cell.open && cell.mine) el.classList.add("boom");

        if (cell.open && !cell.mine && cell.n > 0) {
            el.classList.add("n" + cell.n);
            el.textContent = String(cell.n);
        } else if (cell.flag) {
            el.textContent = "⚑";
        } else {
            el.textContent = "";
        }
    }

    function repaintAll() {
        for (const cell of grid) setCellClass(cell);
    }

    // ===== GAME LOGIC =====
    function openCell(r, c) {
        if (gameOver) return;
        const cell = grid[idx(r, c)];
        if (cell.open || cell.flag) return;

        if (!minesSet) {
            placeMines(r, c);
            startTimer();
            setStatus("RUNNING");
        }

        cell.open = true;
        openedCount++;

        if (cell.mine) {
            lose();
            return;
        }

        if (cell.n === 0) {
            const q = [
                [r, c]
            ];
            const seen = new Set([idx(r, c)]);
            while (q.length) {
                const [rr, cc] = q.shift();
                for (const [nr, nc] of neighbors(rr, cc)) {
                    const id = idx(nr, nc);
                    if (seen.has(id)) continue;
                    seen.add(id);

                    const ncell = grid[id];
                    if (ncell.flag || ncell.open) continue;

                    ncell.open = true;
                    openedCount++;

                    if (!ncell.mine && ncell.n === 0) q.push([nr, nc]);
                }
            }
        }

        repaintAll();
        checkWin();
    }

    function toggleFlag(r, c) {
        if (gameOver) return;
        const cell = grid[idx(r, c)];
        if (cell.open) return;

        cell.flag = !cell.flag;
        flagsCount += cell.flag ? 1 : -1;
        setCellClass(cell);
    }

    function revealMines() {
        for (const cell of grid) {
            if (cell.mine) cell.open = true;
        }
        repaintAll();
    }

    function lose() {
        gameOver = true;
        stopTimer();
        revealMines();
        setStatus("BOOM");
        setScore("—");
    }

    function checkWin() {
        const safe = SIZE * SIZE - MINES;
        if (openedCount >= safe) win();
    }

    function win() {
        gameOver = true;
        stopTimer();
        const timeMs = startTime ? (nowMs() - startTime) : 0;
        const timeStr = formatTime(timeMs);

        setStatus("WIN");
        setScore(timeStr);

        submitScore(timeMs).catch(() => {});
    }

    // ===== INPUT =====
    function onCellLeftClick(el) {
        const r = Number(el.dataset.r);
        const c = Number(el.dataset.c);
        openCell(r, c);
    }

    function onCellRightClick(el) {
        const r = Number(el.dataset.r);
        const c = Number(el.dataset.c);
        toggleFlag(r, c);
    }

    // long tap for flag
    let pressTimer = null;
    let pressTarget = null;
    const LONG_TAP_MS = 350;

    function clearPress() {
        if (pressTimer) clearTimeout(pressTimer);
        pressTimer = null;
        pressTarget = null;
    }

    boardEl.addEventListener("click", (e) => {
        const el = e.target.closest(".sapper-cell");
        if (!el) return;
        onCellLeftClick(el);
    });

    boardEl.addEventListener("contextmenu", (e) => {
        const el = e.target.closest(".sapper-cell");
        if (!el) return;
        e.preventDefault();
        onCellRightClick(el);
    });

    boardEl.addEventListener("touchstart", (e) => {
        const el = e.target.closest(".sapper-cell");
        if (!el) return;

        pressTarget = el;
        clearPress();
        pressTimer = setTimeout(() => {
            if (pressTarget) onCellRightClick(pressTarget);
            clearPress();
        }, LONG_TAP_MS);
    }, { passive: true });

    boardEl.addEventListener("touchend", () => clearPress(), { passive: true });
    boardEl.addEventListener("touchmove", () => clearPress(), { passive: true });
    boardEl.addEventListener("touchcancel", () => clearPress(), { passive: true });

    // ===== FIRESTORE TOP-3 =====
    const COL = "sapper_scores_v1";

    async function getPlayerName() {
        // 1) cache (fast path)
        const cached =
            localStorage.getItem("MBHA_NAME") ||
            localStorage.getItem("mbha_name") ||
            localStorage.getItem("name");
        if (cached) return String(cached).slice(0, 16);

        // 2) take code
        const code =
            localStorage.getItem("MBHA_CODE") ||
            localStorage.getItem("mbha_code") ||
            localStorage.getItem("code");

        if (!code) return "PLAYER";

        // 3) read from flappyScores/{code}
        try {
            const snap = await db.collection("flappyScores").doc(String(code)).get();
            const data = snap.exists ? snap.data() : null;
            const name = data ? .name ? String(data.name) : "PLAYER";

            // cache it for all games
            localStorage.setItem("MBHA_NAME", name);

            return name.slice(0, 16);
        } catch (e) {
            return "PLAYER";
        }
    }

    async function loadTop3() {
        try {
            const snap = await db.collection(COL).orderBy("timeMs", "asc").limit(3).get();
            const rows = snap.docs.map(d => d.data());

            const safeSet = (i, nameEl, scoreEl) => {
                const row = rows[i];
                if (!row) {
                    nameEl.textContent = "—";
                    scoreEl.textContent = "—";
                    return;
                }
                nameEl.textContent = row.name || "—";
                scoreEl.textContent = formatTime(row.timeMs || 0);
            };

            safeSet(0, t1n, t1s);
            safeSet(1, t2n, t2s);
            safeSet(2, t3n, t3s);
        } catch (e) {}
    }

    async function submitScore(timeMs) {
        timeMs = clamp(timeMs, 1, 24 * 60 * 60 * 1000);

        const name = await getPlayerName();
        const payload = {
            name,
            timeMs,
            ts: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection(COL).add(payload);
        await loadTop3();
    }

    // ===== RESET =====
    function resetGame() {
        stopTimer();
        resetTimerUI();

        minesSet = false;
        gameOver = false;
        openedCount = 0;
        flagsCount = 0;

        setStatus("READY");
        setScore("—");

        buildEmptyGrid();
        renderBoard();
        repaintAll();
    }

    btnRestart.addEventListener("click", resetGame);

    // init
    resetGame();
    loadTop3();
})();