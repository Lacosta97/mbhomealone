(function() {
    // =========================
    // CONFIG
    // =========================
    var SIZE = 10;
    var MINES = 17;

    // Firebase config (твой)
    var firebaseConfig = {
        apiKey: "AIzaSyCLbWp6Fl2covgchvupY5H7leUCmlXFAwE",
        authDomain: "mbha-flappy.firebaseapp.com",
        projectId: "mbha-flappy",
        storageBucket: "mbha-flappy.firebasestorage.app",
        messagingSenderId: "800643993606",
        appId: "1:800643993606:web:571b10108b0122ed383387"
    };

    // Как во flappy, только другая коллекция
    var COL = "sapperScores";

    // =========================
    // DOM
    // =========================
    function $(id) { return document.getElementById(id); }

    var boardEl, timerEl, statusEl, scoreEl, restartBtn;
    var top1Name, top2Name, top3Name, top1Score, top2Score, top3Score;

    // =========================
    // Firebase
    // =========================
    var db = null;
    var top3Unsub = null;

    function initFirebase() {
        try {
            if (!window.firebase) return;
            if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
        } catch (e) {
            console.warn("[SAPPER] Firebase init error:", e);
            db = null;
        }
    }

    // Пытаемся достать как в твоём проекте (под разные ключи)
    function getUserContext() {
        var code =
            localStorage.getItem("mbha_code") ||
            localStorage.getItem("MBHA_CODE") ||
            localStorage.getItem("code") ||
            localStorage.getItem("userCode") ||
            "";

        var name =
            localStorage.getItem("mbha_name") ||
            localStorage.getItem("MBHA_NAME") ||
            localStorage.getItem("username") ||
            localStorage.getItem("userName") ||
            "";

        var isGuestRaw =
            localStorage.getItem("mbha_isGuest") ||
            localStorage.getItem("MBHA_IS_GUEST") ||
            localStorage.getItem("isGuest") ||
            "";

        var isGuest = (isGuestRaw === "1" || isGuestRaw === "true" || isGuestRaw === "yes");
        if (!code) isGuest = true;
        if (!name) name = isGuest ? "GUEST" : code;

        return { code: code, name: name, isGuest: isGuest };
    }

    function setTopRow(n, nm, sc) {
        if (!nm) nm = "—";
        if (sc === undefined || sc === null || sc === "") sc = "—";

        if (n === 1) { if (top1Name) top1Name.textContent = nm; if (top1Score) top1Score.textContent = String(sc); }
        if (n === 2) { if (top2Name) top2Name.textContent = nm; if (top2Score) top2Score.textContent = String(sc); }
        if (n === 3) { if (top3Name) top3Name.textContent = nm; if (top3Score) top3Score.textContent = String(sc); }
    }

    function listenTop3() {
        // заглушки
        setTopRow(1, "—", "—");
        setTopRow(2, "—", "—");
        setTopRow(3, "—", "—");

        if (!db) return;

        // чтобы не плодить подписки
        if (typeof top3Unsub === "function") top3Unsub();

        try {
            top3Unsub = db.collection(COL)
                .orderBy("bestScore", "desc")
                .limit(3)
                .onSnapshot(function(snap) {
                    var rows = [];
                    snap.forEach(function(doc) { rows.push(doc.data() || {}); });

                    setTopRow(1, rows[0] ? rows[0].name : "—", rows[0] ? rows[0].bestScore : "—");
                    setTopRow(2, rows[1] ? rows[1].name : "—", rows[1] ? rows[1].bestScore : "—");
                    setTopRow(3, rows[2] ? rows[2].name : "—", rows[2] ? rows[2].bestScore : "—");
                }, function(err) {
                    console.warn("[SAPPER] top3 listen error:", err);
                });
        } catch (e) {
            console.warn("[SAPPER] listenTop3 error:", e);
        }
    }

    async function saveBestScoreIfBetter(finalScore) {
        var u = getUserContext();
        if (u.isGuest) return; // как во flappy: гостей не пишем
        if (!db) return;

        try {
            var ref = db.collection(COL).doc(u.code);
            var doc = await ref.get();

            var prev = 0;
            if (doc.exists) {
                var d = doc.data() || {};
                prev = Number(d.bestScore || 0);
            }

            // как во flappy — сохраняем только если больше
            if (finalScore <= prev) return;

            await ref.set({
                code: u.code,
                name: u.name,
                bestScore: finalScore,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

        } catch (e) {
            console.warn("[SAPPER] save error:", e);
        }
    }

    // =========================
    // Game
    // =========================
    var grid = [];
    var started = false;
    var gameOver = false;
    var openedCount = 0;

    var startMs = 0;
    var timerInt = null;

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
                if (inBounds(rr, cc)) out.push(rcToIdx(rr, cc));
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

    function startTimer() {
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
            var nbs = neighbors(rc.r, rc.c);
            var cnt = 0;
            for (var k = 0; k < nbs.length; k++)
                if (grid[nbs[k]].mine) cnt++;
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

        if (c.el) c.el.classList.add("open");

        if (c.mine) {
            if (c.el) { c.el.textContent = "💣";
                c.el.classList.add("boom"); }
            return true;
        }

        if (c.el) {
            c.el.textContent = "";
            c.el.className = c.el.className.replace(/\bn[1-8]\b/g, "").trim();
            if (c.n > 0) paintNumber(c.el, c.n);
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
                for (var k = 0; k < nbs.length; k++) q.push(nbs[k]);
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

    function ensureStarted(firstIdx) {
        if (started) return;
        started = true;
        if (statusEl) statusEl.textContent = "PLAYING";
        startTimer();
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

    function handleOpen(i) {
        if (gameOver) return;

        ensureStarted(i);

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

            // Скоринг (можем любой формулой) — сейчас простой и понятный
            var score = Math.max(1000 - timeSec * 5, 100);
            if (scoreEl) scoreEl.textContent = String(score);

            // ✅ Firebase как во flappy: bestScore only
            saveBestScoreIfBetter(score);
        }
    }

    function renderGrid() {
        if (!boardEl) return;

        boardEl.innerHTML = "";
        boardEl.style.gridTemplateColumns = "repeat(" + SIZE + ", minmax(64px, 1fr))";

        for (var i = 0; i < grid.length; i++) {
            (function(idx) {
                var cell = document.createElement("div");
                cell.className = "sapper-cell";
                cell.dataset.i = String(idx);

                cell.addEventListener("click", function(e) {
                    e.preventDefault();
                    handleOpen(idx);
                });

                cell.addEventListener("contextmenu", function(e) {
                    e.preventDefault();
                    toggleFlag(idx);
                });

                // long tap -> flag
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
    }

    function resetAll() {
        started = false;
        gameOver = false;
        openedCount = 0;
        stopTimer();

        if (timerEl) timerEl.textContent = "00:00";
        if (statusEl) statusEl.textContent = "READY";
        if (scoreEl) scoreEl.textContent = "—";

        buildEmptyGrid();
        renderGrid();
    }

    // =========================
    // Init
    // =========================
    function init() {
        boardEl = $("sapperBoard");
        timerEl = $("sapperTimer");
        statusEl = $("sapperStatus");
        scoreEl = $("sapperScore");
        restartBtn = $("btnRestart");

        top1Name = $("top1Name");
        top2Name = $("top2Name");
        top3Name = $("top3Name");
        top1Score = $("top1Score");
        top2Score = $("top2Score");
        top3Score = $("top3Score");

        if (!boardEl) {
            console.error("[SAPPER] Не найден #sapperBoard (проверь sapper.html)");
            return;
        }

        initFirebase();
        listenTop3(); // ✅ как во flappy — топ живой

        resetAll();

        if (restartBtn) restartBtn.addEventListener("click", resetAll);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();