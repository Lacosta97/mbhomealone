(function() {
    var SIZE = 10;
    var MINES = 17;

    var grid = [];
    var started = false;
    var gameOver = false;
    var openedCount = 0;

    var startMs = 0;
    var timerInt = null;

    function $(id) { return document.getElementById(id); }

    function rcToIdx(r, c) { return r * SIZE + c; }

    function idxToRC(i) { return { r: Math.floor(i / SIZE), c: i % SIZE }; }

    function inBounds(r, c) { return r >= 0 && c >= 0 && r < SIZE && c < SIZE; }

    function neighbors(r, c) {
        var out = [];
        for (var dr = -1; dr <= 1; dr++) {
            for (var dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                var rr = r + dr,
                    cc = c + dc;
                if (inBounds(rr, cc)) out.push({ r: rr, c: cc, i: rcToIdx(rr, cc) });
            }
        }
        return out;
    }

    function formatTime(sec) {
        var m = String(Math.floor(sec / 60));
        if (m.length < 2) m = "0" + m;
        var s = String(sec % 60);
        if (s.length < 2) s = "0" + s;
        return m + ":" + s;
    }

    function startTimer(timerEl) {
        startMs = Date.now();
        clearInterval(timerInt);
        timerInt = setInterval(function() {
            var sec = Math.floor((Date.now() - startMs) / 1000);
            if (timerEl) timerEl.textContent = formatTime(sec);
        }, 200);
    }

    function stopTimer() { clearInterval(timerInt);
        timerInt = null; }

    function buildEmptyGrid() {
        grid = [];
        for (var i = 0; i < SIZE * SIZE; i++) {
            grid.push({ mine: false, open: false, flag: false, n: 0, el: null });
        }
    }

    function placeMines(excludeIdx) {
        var placed = 0;
        while (placed < MINES) {
            var i = Math.floor(Math.random() * (SIZE * SIZE));
            if (i === excludeIdx) continue;
            if (!grid[i].mine) { grid[i].mine = true;
                placed++; }
        }
    }

    function calcNumbers() {
        for (var i = 0; i < grid.length; i++) {
            if (grid[i].mine) { grid[i].n = -1; continue; }
            var rc = idxToRC(i);
            var cnt = 0;
            var nbs = neighbors(rc.r, rc.c);
            for (var k = 0; k < nbs.length; k++)
                if (grid[nbs[k].i].mine) cnt++;
            grid[i].n = cnt;
        }
    }

    function paintNumber(el, n) {
        el.textContent = String(n);
        el.classList.add("n" + n);
    }

    function openCell(i) {
        var c = grid[i];
        if (c.open || c.flag) return false;

        c.open = true;
        openedCount++;

        if (c.el) {
            c.el.classList.add("open");
        }

        if (c.mine) {
            if (c.el) { c.el.textContent = "💣";
                c.el.classList.add("boom"); }
            return true;
        }

        if (c.el) {
            if (c.n > 0) paintNumber(c.el, c.n);
            else c.el.textContent = "";
        }

        return false;
    }

    function floodOpenZeros(startIdx) {
        var q = [startIdx];
        var seen = {};
        while (q.length) {
            var cur = q.shift();
            if (seen[cur]) continue;
            seen[cur] = true;

            var cell = grid[cur];
            if (cell.open || cell.flag) continue;

            var hit = openCell(cur);
            if (hit) continue;

            if (cell.n === 0) {
                var rc = idxToRC(cur);
                var nbs = neighbors(rc.r, rc.c);
                for (var k = 0; k < nbs.length; k++) q.push(nbs[k].i);
            }
        }
    }

    function checkWin() { return openedCount === (SIZE * SIZE - MINES); }

    function revealAllMines(hitIdx) {
        for (var i = 0; i < grid.length; i++) {
            if (grid[i].mine && grid[i].el) {
                grid[i].el.classList.add("open");
                grid[i].el.textContent = "💣";
            }
        }
        if (typeof hitIdx === "number" && grid[hitIdx] && grid[hitIdx].el) {
            grid[hitIdx].el.classList.add("boom");
        }
    }

    function ensureStarted(firstIdx, statusEl, timerEl) {
        if (started) return;
        started = true;
        if (statusEl) statusEl.textContent = "PLAYING";
        startTimer(timerEl);
        placeMines(firstIdx);
        calcNumbers();
    }

    function toggleFlag(i) {
        if (gameOver) return;
        var c = grid[i];
        if (c.open) return;

        c.flag = !c.flag;
        if (c.el) {
            c.el.classList.toggle("flag", c.flag);
            c.el.textContent = c.flag ? "🚩" : "";
        }
    }

    function handleOpen(i, statusEl, timerEl, scoreEl) {
        if (gameOver) return;

        ensureStarted(i, statusEl, timerEl);

        var c = grid[i];
        if (c.flag || c.open) return;

        if (c.mine) {
            openCell(i);
            gameOver = true;
            stopTimer();
            if (statusEl) statusEl.textContent = "GAME OVER";
            if (scoreEl) scoreEl.textContent = "—";
            revealAllMines(i);
            return;
        }

        if (c.n === 0) floodOpenZeros(i);
        else openCell(i);

        if (checkWin()) {
            gameOver = true;
            stopTimer();
            if (statusEl) statusEl.textContent = "WIN";
            var timeSec = Math.floor((Date.now() - startMs) / 1000);
            var score = Math.max(1000 - timeSec * 5, 100);
            if (scoreEl) scoreEl.textContent = String(score);
        }
    }

    function renderGrid(boardEl, statusEl, timerEl, scoreEl) {
        if (!boardEl) return;

        boardEl.innerHTML = "";
        boardEl.style.gridTemplateColumns = "repeat(" + SIZE + ", minmax(34px, 1fr))";

        for (var i = 0; i < grid.length; i++) {
            (function(idx) {
                var cell = document.createElement("div");
                cell.className = "sapper-cell";
                cell.dataset.i = String(idx);

                cell.addEventListener("click", function(e) {
                    e.preventDefault();
                    handleOpen(idx, statusEl, timerEl, scoreEl);
                });

                cell.addEventListener("contextmenu", function(e) {
                    e.preventDefault();
                    toggleFlag(idx);
                });

                var pressT = null;
                cell.addEventListener("touchstart", function() {
                    if (gameOver) return;
                    pressT = setTimeout(function() { toggleFlag(idx); }, 420);
                }, { passive: true });

                cell.addEventListener("touchend", function() {
                    if (pressT) clearTimeout(pressT);
                    pressT = null;
                });

                grid[idx].el = cell;
                boardEl.appendChild(cell);
            })(i);
        }

        console.log("[SAPPER] rendered cells:", boardEl.children.length);
    }

    function resetAll(boardEl, statusEl, timerEl, scoreEl) {
        started = false;
        gameOver = false;
        openedCount = 0;
        stopTimer();

        if (timerEl) timerEl.textContent = "00:00";
        if (statusEl) statusEl.textContent = "READY";
        if (scoreEl) scoreEl.textContent = "—";

        buildEmptyGrid();
        renderGrid(boardEl, statusEl, timerEl, scoreEl);
    }

    function init() {
        var boardEl = $("sapperBoard");
        var timerEl = $("sapperTimer");
        var statusEl = $("sapperStatus");
        var scoreEl = $("sapperScore");
        var restartBtn = $("btnRestart");

        console.log("[SAPPER] board:", boardEl);

        if (!boardEl) {
            console.error("[SAPPER] Не найден #sapperBoard — ты точно открыл sapper.html который ты скинул?");
            return;
        }

        buildEmptyGrid();
        renderGrid(boardEl, statusEl, timerEl, scoreEl);

        if (statusEl) statusEl.textContent = "READY";
        if (scoreEl) scoreEl.textContent = "—";
        if (timerEl) timerEl.textContent = "00:00";

        if (restartBtn) {
            restartBtn.addEventListener("click", function() {
                resetAll(boardEl, statusEl, timerEl, scoreEl);
            });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();