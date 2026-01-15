(() => {
    "use strict";

    // ====== GOOGLE SHEET ======
    const PUBHTML_URL =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtWbgxyuW-7Dr8wSuY3Zq2giptTNS4V31mf_tryTyHUPXPrnZLalThAjCfa_YBMGRl9aNmQOe3mHuU/pubhtml";
    const SHEET_CSV_URL = PUBHTML_URL.replace(/\/pubhtml.*$/i, "/pub?output=csv");

    // ====== PATHS (IMPORTANT: paths are resolved from results/cards.html) ======
    // Avatars: mbhomealone/img/avatars -> from results/ it's ../img/avatars
    const AVATAR_BASE = "../img/avatars/"; // CODE.png
    const AVATAR_GUEST = "GUEST.png";

    // Team icons: mbhomealone/results/img/icons -> from results/ it's ./img/icons
    const TEAM_BADGES = {
        bandits: "./img/icons/team-bandits.png",
        boss: "./img/icons/team-boss.png",
        kevin: "./img/icons/team-kevin.png",
    };

    // Final scene assets: mbhomealone/results/img/final
    const FINAL_ASSETS = {
        coin: "./img/final/coin.png",
    };

    // ====== AUDIO ======
    // Your audio folder is: mbhomealone/audio  -> from results/ it's ../audio
    const AUDIO = {
        shuffle: "../audio/card_shuffle03.mp3", // ROLL shuffle sound (1s shuffle)
        olenmoneta: "../audio/olenmoneta.mp3", // deer coins 5s
        boxcoins: "../audio/boxcoins.mp3", // pump 4s
        summa: "../audio/summa.mp3", // count 5s (play twice)
        shmiak: "../audio/shmiak.mp3",
        dontPush: "../audio/dont-push-guest.mp3",
        tiktak: "../audio/tiktak.mp3",
        bulk: "../audio/bulk.mp3",
        watc: "../audio/watc.mp3",
        boxshmyak: "../audio/boxshmyak.mp3",
        boxopencoin: "../audio/boxopencoin.mp3",
    };

    // ====== SETTINGS ======
    const STORAGE_KEY = "mbha_cards_opened_v2";
    const LIMIT = 18;

    // IMPORTANT (temporary): RESULTS button visible always
    const RESULTS_ALWAYS_VISIBLE = true;

    // ROLL duration (exactly 1s)
    const ROLL_DURATION_MS = 1000;

    // Slam tuning
    const SLAM_DUR_MS = 260; // must match CSS boxSlam duration
    const SLAM_GAP_MS = 1000; // gap between left & right slam
    const OPEN_AFTER_PUMP_DELAY_MS = 500;

    // ====== TUNE MODE (stop final scene after deer slide-in) ======
    const TUNE_MODE = (() => {
        try {
            return new URL(window.location.href).searchParams.get("tune") === "1";
        } catch {
            return false;
        }
    })();

    // ====== DOM ======
    const track = document.getElementById("track");
    const fxLayer = document.getElementById("fxLayer");
    const status = document.getElementById("status");
    const statusText = document.getElementById("statusText");

    const btnRoll = document.getElementById("btnRoll");
    const nav = document.getElementById("nav");
    const btnPrev = document.getElementById("btnPrev");
    const btnNext = document.getElementById("btnNext");
    const btnReset = document.getElementById("btnReset");

    const info = document.getElementById("info");
    const infoName = document.getElementById("infoName");
    const infoPA = document.getElementById("infoPA");
    const infoAbout = document.getElementById("infoAbout");

    // RESULTS (button + overlay)
    const btnResults = document.getElementById("btnResults");
    const results = document.getElementById("results");
    const btnResultsClose = document.getElementById("btnResultsClose");

    // Final scene DOM
    const rsRoot = document.getElementById("rsRoot");
    const deerLeft = document.getElementById("deerLeft");
    const deerRight = document.getElementById("deerRight");
    const coinsLayer = document.getElementById("coinsLayer");
    const cauldron = document.getElementById("cauldron");
    const pipeLeft = document.getElementById("pipeLeft");
    const pipeRight = document.getElementById("pipeRight");

    // ✅ BOXES (not bottles)
    const boxes = document.getElementById("boxes");
    const boxKevin = document.getElementById("boxKevin");
    const boxBandits = document.getElementById("boxBandits");

    const countKevin = document.getElementById("countKevin");
    const countBandits = document.getElementById("countBandits");

    const dynamite = document.getElementById("dynamite");

    const winnerLayer = document.getElementById("winnerLayer");
    const fireworks = document.getElementById("fireworks");
    const winnerSprite = document.getElementById("winnerSprite");
    const winText = document.getElementById("winText");
    const winnerAvatars = document.getElementById("winnerAvatars");
    const flash = document.getElementById("flash");

    // Box inner label nodes (for delayed appearance)
    const labelKevin = boxKevin ? boxKevin.querySelector(".rs__label") : null;
    const labelBandits = boxBandits ? boxBandits.querySelector(".rs__label") : null;

    // ====== STATE ======
    const opened = loadOpened();
    let players = [];
    let cardEls = [];
    let active = 0;
    let rolling = false;

    // Final scene state
    let finalRunning = false;
    let coinTimer = null;
    let pipeTimer = null;
    let spriteTimer = null;

    // Audio state
    const audioPool = {};
    let audioUnlocked = false;

    // ====== Anti-zoom (Safari) ======
    document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
    document.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: false });
    document.addEventListener("gestureend", (e) => e.preventDefault(), { passive: false });
    document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

    // ====== STATUS ======
    function showStatus(text) {
        if (!status) return;
        status.classList.add("is-on");
        if (statusText) statusText.textContent = text;
    }

    function hideStatus() {
        if (!status) return;
        status.classList.remove("is-on");
    }

    // ====== STORAGE ======
    function loadOpened() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return new Set();
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return new Set();
            return new Set(arr.filter((x) => typeof x === "string"));
        } catch {
            return new Set();
        }
    }

    function saveOpened() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...opened]));
    }

    // ====== HELPERS ======
    function escapeAttr(str) {
        return String(str).replaceAll("'", "%27");
    }

    // ✅ make CODE safe vs case mismatch
    function avatarUrl(code) {
        const c = String(code || "").trim().toUpperCase();
        if (!c || c === "GUEST") return AVATAR_BASE + AVATAR_GUEST;
        return AVATAR_BASE + c + ".png";
    }

    function normTeamKey(raw) {
        const t = String(raw || "").trim().toLowerCase();
        if (!t) return "kevin";
        if (t.includes("band") || t.includes("банд") || t.includes("wet")) return "bandits";
        if (t.includes("boss") || t.includes("босс") || t.includes("шеф") || t.includes("admin")) return "boss";
        if (t.includes("kevin") || t.includes("кев")) return "kevin";
        if (t === "bandits" || t === "boss" || t === "kevin") return t;
        return "kevin";
    }

    function badgeFor(teamKey) {
        return TEAM_BADGES[teamKey] || TEAM_BADGES.kevin;
    }

    // ====== CSV PARSER ======
    function parseCSV(text) {
        const rows = [];
        let row = [];
        let cur = "";
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const next = text[i + 1];

            if (inQuotes) {
                if (ch === '"' && next === '"') {
                    cur += '"';
                    i++;
                } else if (ch === '"') {
                    inQuotes = false;
                } else {
                    cur += ch;
                }
            } else {
                if (ch === '"') inQuotes = true;
                else if (ch === ",") {
                    row.push(cur);
                    cur = "";
                } else if (ch === "\n") {
                    row.push(cur);
                    rows.push(row);
                    row = [];
                    cur = "";
                } else if (ch === "\r") {
                    // ignore
                } else {
                    cur += ch;
                }
            }
        }
        row.push(cur);
        rows.push(row);

        return rows.filter((r) => r.some((cell) => String(cell).trim() !== ""));
    }

    function rowsToObjects(rows) {
        if (!rows.length) return [];
        const headers = rows[0].map((h) => String(h).trim().toUpperCase());
        const out = [];
        for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            const obj = {};
            for (let c = 0; c < headers.length; c++) {
                obj[headers[c]] = (r[c] == null ? "" : String(r[c])).trim();
            }
            out.push(obj);
        }
        return out;
    }

    // ====== money ======
    function parseMoneyToInt(raw) {
        const s = String(raw === null || raw === undefined ? "" : raw).trim();
        if (!s) return 0;
        const m = s.replace(/[^\d-]/g, "");
        const n = Number(m);
        return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
    }

    function formatUAH(raw) {
        const s = String(raw === null || raw === undefined ? "" : raw).trim();
        if (!s) return "";
        const digits = s.replace(/\s+/g, "");
        if (/^-?\d+(\.\d+)?$/.test(digits)) {
            const n = Number(digits);
            if (!Number.isFinite(n)) return s;
            return n.toLocaleString("uk-UA") + "₴";
        }
        return s;
    }

    // ====== SHEET CELLS (Totals) ======
    // Kevin TOTAL: F2, Bandits TOTAL: G2
    function colLetterToIndex(letter) {
        const s = String(letter || "").trim().toUpperCase();
        if (!s) return -1;
        let n = 0;
        for (let i = 0; i < s.length; i++) {
            const code = s.charCodeAt(i);
            if (code < 65 || code > 90) return -1;
            n = n * 26 + (code - 64);
        }
        return n - 1;
    }

    function getCell(rows, row1based, colLetter) {
        const r = Math.max(1, Number(row1based || 1)) - 1;
        const c = colLetterToIndex(colLetter);
        if (!Array.isArray(rows) || r < 0 || c < 0) return "";
        const row = rows[r];
        if (!row || c >= row.length) return "";
        return row[c] == null ? "" : String(row[c]).trim();
    }

    async function fetchTotalsFromSheetCells() {
        const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("Sheet fetch failed: " + res.status);
        const csv = await res.text();
        const rows = parseCSV(csv);
        const kevinRaw = getCell(rows, 2, "F"); // F2
        const banditsRaw = getCell(rows, 2, "G"); // G2
        const kevin = parseMoneyToInt(kevinRaw);
        const bandits = parseMoneyToInt(banditsRaw);
        if (!kevin && !bandits) return null;
        return { kevin, bandits };
    }

    // ====== AUDIO ======
    function getAudio(key) {
        if (audioPool[key]) return audioPool[key];
        const src = AUDIO[key];
        if (!src) return null;
        const a = new Audio(src);
        a.preload = "auto";
        a.volume = 1;
        audioPool[key] = a;
        return a;
    }

    async function unlockAudioOnce() {
        if (audioUnlocked) return;
        audioUnlocked = true;

        // iOS unlock trick: play muted, then pause
        const a = getAudio("shuffle") || new Audio();
        try {
            a.muted = true;
            await a.play();
            a.pause();
            a.currentTime = 0;
            a.muted = false;
        } catch {
            // ignore
        }
    }

    function stopSfx(key) {
        const a = audioPool[key];
        if (!a) return;
        try {
            a.pause();
            a.currentTime = 0;
        } catch {
            // ignore
        }
    }

    function stopAllAudio() {
        for (const k of Object.keys(audioPool)) stopSfx(k);
    }

    async function playSfx(key, { restart = true } = {}) {
        const a = getAudio(key);
        if (!a) return;
        try {
            if (restart) a.currentTime = 0;
            await a.play();
        } catch {
            // ignore (autoplay policy / missing file)
        }
    }

    async function playSfxForDuration(key, ms) {
        await playSfx(key, { restart: true });
        window.setTimeout(() => stopSfx(key), Math.max(0, ms | 0));
    }

    // ====== UI BUILD ======
    function createCard(player) {
        const code = String(player.CODE || "").trim();
        const name = String(player.NAME || "").trim() || "Гість";
        const teamKey = normTeamKey(player.TEAM);

        const el = document.createElement("button");
        el.type = "button";
        el.className = "card";
        el.dataset.code = code;
        el.dataset.team = teamKey;
        el.setAttribute("aria-label", "Карта: " + name);

        const avatar = escapeAttr(avatarUrl(code));
        const badge = escapeAttr(badgeFor(teamKey));

        el.innerHTML = `
      <div class="card__inner">
        <div class="face back"></div>
        <div class="face front">
          <div class="front__img" style="background-image:url('${avatar}')"></div>
          <div class="front__shade"></div>
          <img class="team-badge" src="${badge}" alt="">
        </div>
      </div>
    `;

        if (opened.has(code)) el.classList.add("is-open");

        el.addEventListener(
            "click",
            (e) => {
                e.preventDefault();
                if (rolling) return;

                const centerEl = cardEls[active];
                if (el !== centerEl) return;

                const codeNow = String(player.CODE || "").trim();
                if (opened.has(codeNow)) {
                    burstFx(centerEl, 10);
                    updateInfo();
                    return;
                }

                opened.add(codeNow);
                saveOpened();
                centerEl.classList.add("is-open");
                burstFx(centerEl, 18);

                updateInfo();
                updateMode();

                if (!isAllOpened() && btnRoll) btnRoll.hidden = false;
            }, { passive: false }
        );

        return el;
    }

    function mountCards() {
        track.innerHTML = "";
        cardEls = players.map((p) => createCard(p));
        for (const el of cardEls) track.appendChild(el);

        const firstClosed = players.findIndex((p) => !opened.has(String(p.CODE || "").trim()));
        active = firstClosed >= 0 ? firstClosed : 0;

        layout();
        updateInfo();
        updateMode();
    }

    // ====== LAYOUT ======
    function getGapPx() {
        const v = getComputedStyle(document.documentElement).getPropertyValue("--gap").trim();
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : 125;
    }

    function mod(n, m) {
        return ((n % m) + m) % m;
    }

    function layout() {
        if (!cardEls.length) return;
        const gap = getGapPx();
        const N = cardEls.length;
        const visibleRange = 4;

        for (let i = 0; i < N; i++) {
            const el = cardEls[i];

            let d = i - active;
            if (d > N / 2) d -= N;
            if (d < -N / 2) d += N;

            const isCenter = d === 0;
            el.classList.toggle("is-active", isCenter);

            if (Math.abs(d) > visibleRange) {
                el.style.opacity = "0";
                el.style.pointerEvents = "none";
                el.style.transform = "translate(-50%,-50%) translateX(0px) scale(0.6)";
                continue;
            }

            el.style.opacity = "1";
            el.style.pointerEvents = "auto";

            const x = d * gap;
            const scale = isCenter ? 1 : Math.abs(d) === 1 ? 0.86 : Math.abs(d) === 2 ? 0.78 : 0.72;

            el.style.filter = isCenter ? "none" : "saturate(.9) brightness(.78)";
            el.style.transform = `translate(-50%,-50%) translateX(${x}px) scale(${scale})`;
            el.style.zIndex = String(1000 - Math.abs(d) * 10);
        }

        updateInfo();
    }

    function updateInfo() {
        if (!players.length || !info || !infoName) return;

        const p = players[active];
        const code = String(p.CODE || "").trim();
        const isOpen = opened.has(code);

        if (!isOpen) {
            info.classList.remove("is-on");
            infoName.textContent = "—";
            if (infoPA) infoPA.textContent = "";
            if (infoAbout) infoAbout.textContent = "";
            return;
        }

        infoName.textContent = String(p.NAME || "Гість").toUpperCase();

        if (infoPA) {
            const paRaw =
                p["PERSONAL ACCOUNT"] !== null && p["PERSONAL ACCOUNT"] !== undefined ?
                p["PERSONAL ACCOUNT"] :
                p.PA !== null && p.PA !== undefined ?
                p.PA :
                "";

            const paFmt = formatUAH(paRaw);
            infoPA.textContent = paFmt ? `PA: ${paFmt}` : "";
        }

        if (infoAbout) {
            const aboutRaw = p["ABOUT"] !== null && p["ABOUT"] !== undefined ? p["ABOUT"] : "";
            infoAbout.textContent = String(aboutRaw);
        }

        info.classList.add("is-on");
    }

    function isAllOpened() {
        const total = players.length || LIMIT;
        return opened.size >= total && total > 0;
    }

    function updateMode() {
        const all = isAllOpened();

        // ✅ TEMP: RESULTS visible always
        if (btnResults) btnResults.hidden = !RESULTS_ALWAYS_VISIBLE ? !all : false;

        if (btnRoll) btnRoll.hidden = all;
        if (nav) nav.hidden = !all;
    }

    // ====== ROLL (exact 1s + shuffle sound) ======
    function pickRandomClosedIndex() {
        const closed = [];
        for (let i = 0; i < players.length; i++) {
            const code = String(players[i].CODE || "").trim();
            if (!opened.has(code)) closed.push(i);
        }
        if (!closed.length) return active;
        return closed[Math.floor(Math.random() * closed.length)];
    }

    function roll() {
        if (rolling) return;
        if (isAllOpened()) return;
        // ✅ safety: если игроков меньше 2 — тасовка невозможна
        if (!players || players.length < 2) {
            rolling = false;
            track.classList.remove("is-rolling");
            if (btnRoll) btnRoll.hidden = false;
            return;
        }

        unlockAudioOnce();

        // ✅ звук тасовки строго 1 сек
        playSfxForDuration("shuffle", ROLL_DURATION_MS);

        rolling = true;
        if (btnRoll) btnRoll.hidden = true;
        track.classList.add("is-rolling");

        const target = pickRandomClosedIndex();
        const N = players.length;

        // Делаем "ощущение тасовки": 2 круга + добег до target
        const startIndex = active;
        const forwardDist = mod(target - startIndex, N);
        const extraLoops = N * 2;
        const totalSteps = extraLoops + forwardDist;

        const startTime = performance.now();
        const endTime = startTime + ROLL_DURATION_MS;

        // Зафиксируем стартовую позицию и будем вычислять прогресс шагов по времени
        let lastAppliedSteps = 0;

        const rafTick = (now) => {
            if (!rolling) return;

            const t = Math.min(1, (now - startTime) / ROLL_DURATION_MS);
            const stepsNow = Math.floor(totalSteps * t);

            const delta = stepsNow - lastAppliedSteps;
            if (delta > 0) {
                active = mod(active + delta, N);
                lastAppliedSteps = stepsNow;
                layout();
            }

            if (now >= endTime) {
                // ✅ конец ровно в 1 сек: принудительно ставим target
                active = target;
                layout();
                updateInfo();

                rolling = false;
                track.classList.remove("is-rolling");

                // ✅ на всякий случай глушим тасовку (если таймер где-то задержался)
                stopSfx("shuffle");

                if (!isAllOpened() && btnRoll) btnRoll.hidden = false;
                return;
            }

            requestAnimationFrame(rafTick);
        };

        requestAnimationFrame(rafTick);
    }

    // ====== NAV ======
    function step(dir) {
        const N = players.length;
        active = mod(active + dir, N);
        layout();
    }

    // ====== FX ======
    function burstFx(cardEl, amount) {
        const rect = cardEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const count = Number.isFinite(amount) ? amount : 14;

        for (let i = 0; i < count; i++) {
            const p = document.createElement("div");
            p.className = "fx-dot";

            const ang = Math.random() * Math.PI * 2;
            const dist = 18 + Math.random() * 62;

            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist - (8 + Math.random() * 14);

            const s = 0.8 + Math.random() * 1.0;

            p.style.setProperty("--dx", dx + "px");
            p.style.setProperty("--dy", dy + "px");
            p.style.setProperty("--s", String(s));

            p.style.left = cx + "px";
            p.style.top = cy + "px";

            fxLayer.appendChild(p);
            window.setTimeout(() => p.remove(), 560);
        }
    }

    // ====== LOAD ======
    async function loadPlayers() {
        showStatus("Завантажую гравців…");
        const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("Sheet fetch failed: " + res.status);

        const csv = await res.text();
        const rows = parseCSV(csv);
        const objs = rowsToObjects(rows);

        return objs.filter((o) => String(o.CODE || "").trim() !== "").slice(0, LIMIT);
    }

    // ====== EVENTS ======
    if (btnRoll) btnRoll.addEventListener("click", roll);

    if (btnPrev)
        btnPrev.addEventListener(
            "click",
            (e) => {
                e.preventDefault();
                step(-1);
            }, { passive: false }
        );

    if (btnNext)
        btnNext.addEventListener(
            "click",
            (e) => {
                e.preventDefault();
                step(1);
            }, { passive: false }
        );

    if (btnReset)
        btnReset.addEventListener(
            "click",
            (e) => {
                e.preventDefault();
                localStorage.removeItem(STORAGE_KEY);
                opened.clear();
                for (const el of cardEls) el.classList.remove("is-open");

                const firstClosed = players.findIndex((p) => !opened.has(String(p.CODE || "").trim()));
                active = firstClosed >= 0 ? firstClosed : 0;

                layout();
                updateMode();
            }, { passive: false }
        );

    // ====== RESULTS open/close ======
    function openResults() {
        if (!results) return;
        unlockAudioOnce(); // unlock on user gesture
        results.classList.add("is-open");
        results.setAttribute("aria-hidden", "false");
        startFinalScene(); // async ok
    }

    function closeResults() {
        if (!results) return;
        results.classList.remove("is-open");
        results.setAttribute("aria-hidden", "true");
        stopFinalScene();
    }

    if (btnResults) btnResults.addEventListener("click", openResults);
    if (btnResultsClose) btnResultsClose.addEventListener("click", closeResults);

    window.addEventListener("resize", () => layout());

    // ============================================================
    // ====================== FINAL SCENE ==========================
    // ============================================================

    function hasFinalDOM() {
        return !!(
            rsRoot &&
            deerLeft &&
            deerRight &&
            coinsLayer &&
            cauldron &&
            pipeLeft &&
            pipeRight &&
            boxes &&
            boxKevin &&
            boxBandits &&
            countKevin &&
            countBandits &&
            dynamite &&
            flash
        );
    }

    function clearTimers() {
        if (coinTimer) window.clearInterval(coinTimer);
        if (pipeTimer) window.clearInterval(pipeTimer);
        if (spriteTimer) window.clearInterval(spriteTimer);
        coinTimer = null;
        pipeTimer = null;
        spriteTimer = null;
    }

    function hideCounts() {
        if (labelKevin) labelKevin.style.opacity = "0";
        if (labelBandits) labelBandits.style.opacity = "0";
        if (countKevin) countKevin.style.opacity = "0";
        if (countBandits) countBandits.style.opacity = "0";
    }

    function showCounts() {
        if (labelKevin) labelKevin.style.opacity = "1";
        if (labelBandits) labelBandits.style.opacity = "1";
        if (countKevin) countKevin.style.opacity = "1";
        if (countBandits) countBandits.style.opacity = "1";
    }

    function stopFinalScene() {
        finalRunning = false;
        clearTimers();
        stopAllAudio();

        if (!hasFinalDOM()) return;

        // reset classes
        rsRoot.className = "rs";
        rsRoot.style.transform = "";
        rsRoot.style.opacity = "";

        // reset visibility (EMPTY screen)
        deerLeft.style.opacity = "0";
        deerRight.style.opacity = "0";
        cauldron.style.opacity = "0";
        pipeLeft.style.opacity = "0";
        pipeRight.style.opacity = "0";
        boxes.style.opacity = "0";
        dynamite.style.opacity = "0";

        if (boxKevin) boxKevin.classList.remove("is-slam");
        if (boxBandits) boxBandits.classList.remove("is-slam");
        if (boxes) boxes.classList.remove("is-pulse");

        if (winnerLayer) winnerLayer.style.opacity = "0";
        if (fireworks) fireworks.style.opacity = "0";
        if (winnerSprite) winnerSprite.style.opacity = "0";
        if (winText) winText.style.opacity = "0";
        if (winnerAvatars) winnerAvatars.style.opacity = "0";
        if (flash) flash.style.opacity = "0";

        if (coinsLayer) coinsLayer.innerHTML = "";

        setCounter(countKevin, 0, 7);
        setCounter(countBandits, 0, 7);

        // reset images
        setBgFromData(deerLeft, "closed");
        setBgFromData(deerRight, "closed");
        setBgFromData(pipeLeft, "a");
        setBgFromData(pipeRight, "a");
        setBgFromData(boxKevin, "closed");
        setBgFromData(boxBandits, "closed");

        // reset transforms
        deerLeft.style.transform = "";
        deerRight.style.transform = "";
        cauldron.style.transform = "";
        pipeLeft.style.transform = "";
        pipeRight.style.transform = "";
        boxes.style.transform = "";
        dynamite.style.transform = "";

        // reset winner avatars
        if (winnerAvatars) winnerAvatars.innerHTML = "";

        hideCounts();
    }

    async function startFinalScene() {
        if (!hasFinalDOM()) return;
        if (finalRunning) return;

        finalRunning = true;
        clearTimers();
        stopAllAudio();

        // Make sure we start from ABSOLUTE EMPTY screen
        stopFinalScene();
        finalRunning = true;

        rsRoot.classList.add("is-on");
        hideCounts();
        renderWinnerAvatars();

        let totals = null;
        try {
            totals = await fetchTotalsFromSheetCells();
        } catch {
            totals = null;
        }
        if (!totals) totals = computeTeamTotalsFromPlayers();

        const targetKevin = Math.max(0, totals.kevin || 0);
        const targetBandits = Math.max(0, totals.bandits || 0);

        timelineKevinWins(targetKevin, targetBandits).catch(() => stopFinalScene());
    }

    function computeTeamTotalsFromPlayers() {
        let sumKevin = 0;
        let sumBandits = 0;

        for (const p of players) {
            const team = normTeamKey(p.TEAM);
            const paRaw =
                p["PERSONAL ACCOUNT"] !== null && p["PERSONAL ACCOUNT"] !== undefined ?
                p["PERSONAL ACCOUNT"] :
                p.PA !== null && p.PA !== undefined ?
                p.PA :
                "";

            const n = parseMoneyToInt(paRaw);
            if (team === "kevin") sumKevin += n;
            if (team === "bandits") sumBandits += n;
        }

        if (sumKevin === 0 && sumBandits === 0) {
            sumKevin = 1854320;
            sumBandits = 1739010;
        }

        return { kevin: sumKevin, bandits: sumBandits };
    }

    function renderWinnerAvatars() {
        if (!winnerAvatars) return;
        winnerAvatars.innerHTML = "";

        const codes = [];
        for (const p of players) {
            const code = String(p.CODE || "").trim();
            if (!code) continue;
            if (normTeamKey(p.TEAM) !== "kevin") continue;
            const up = code.toUpperCase();
            if (!codes.includes(up)) codes.push(up);
            if (codes.length >= 7) break;
        }

        for (const code of codes) {
            const d = document.createElement("div");
            d.className = "rs__avatar";
            d.style.backgroundImage = `url('${avatarUrl(code)}')`;
            winnerAvatars.appendChild(d);
        }
    }

    function setCounter(el, value, digits = 7) {
        if (!el) return;
        const v = Math.max(0, Math.floor(value));
        el.textContent = String(v).padStart(digits, "0");
    }

    function setBgFromData(el, which) {
        if (!el) return;
        const key = which === "open" || which === "closed" ? which : which === "b" ? "b" : "a";
        const src = el.dataset ? el.dataset[key] : "";
        if (src) el.style.backgroundImage = `url('${src}')`;
    }

    function rectCenterIn(el, root) {
        const r = el.getBoundingClientRect();
        const rr = root.getBoundingClientRect();
        return { x: r.left - rr.left + r.width / 2, y: r.top - rr.top + r.height / 2 };
    }

    function spawnCoin(fromX, fromY, toX, toY, dur = 900) {
        if (!coinsLayer) return;
        const c = document.createElement("div");
        c.className = "rs__coin";
        c.style.backgroundImage = `url('${FINAL_ASSETS.coin}')`;
        c.style.left = `${fromX}px`;
        c.style.top = `${fromY}px`;
        c.style.opacity = "1";

        const rot = (Math.random() * 720 - 360) | 0;
        const midX = fromX + (toX - fromX) * (0.35 + Math.random() * 0.18) + (Math.random() * 70 - 35);
        const midY = fromY + (toY - fromY) * (0.45 + Math.random() * 0.18) - (60 + Math.random() * 70);

        c.animate(
            [
                { transform: `translate(-50%,-50%) rotate(0deg)`, offset: 0 },
                { transform: `translate(${midX - fromX}px, ${midY - fromY}px) rotate(${rot / 2}deg)`, offset: 0.55 },
                { transform: `translate(${toX - fromX}px, ${toY - fromY}px) rotate(${rot}deg)`, offset: 1 },
            ], { duration: dur, easing: "cubic-bezier(.2,.8,.2,1)" }
        );

        coinsLayer.appendChild(c);
        window.setTimeout(() => c.remove(), dur + 60);
    }

    function flashOnce(ms = 160) {
        if (!flash) return;
        flash.style.opacity = "0";
        flash.animate([{ opacity: 0 }, { opacity: 0.95 }, { opacity: 0 }], {
            duration: ms,
            easing: "ease-out",
        });
    }

    function startPipeAnim() {
        let t = false;
        pipeTimer = window.setInterval(() => {
            if (!finalRunning) return;
            t = !t;
            setBgFromData(pipeLeft, t ? "b" : "a");
            setBgFromData(pipeRight, t ? "b" : "a");
        }, 140);
    }

    function stopPipeAnim() {
        if (pipeTimer) window.clearInterval(pipeTimer);
        pipeTimer = null;
    }

    function startKevinSprite() {
        if (!winnerSprite) return;

        // sprite sheet: 6 frames, 3 cols x 2 rows
        const frames = 6;
        const cols = 3;
        const rows = 2;

        winnerSprite.style.backgroundRepeat = "no-repeat";
        winnerSprite.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;

        let frame = 0;
        spriteTimer = window.setInterval(() => {
            if (!finalRunning) return;
            const f = frame % frames;
            const cx = f % cols;
            const cy = Math.floor(f / cols);
            const x = cols === 1 ? 0 : (cx * 100) / (cols - 1);
            const y = rows === 1 ? 0 : (cy * 100) / (rows - 1);
            winnerSprite.style.backgroundPosition = `${x}% ${y}%`;
            frame++;
        }, 120);
    }

    // ====== POSITIONS / SLIDE-IN ======
    function getDeerEdgeInX() {
        const OFFSET = -25;
        const LEFT_NUDGE = -10;
        const RIGHT_NUDGE = 35;
        const DEER_Y_NUDGE = -15;

        const leftRaw = getComputedStyle(deerLeft).left;
        const rightRaw = getComputedStyle(deerRight).right;
        const left = Number.isFinite(parseFloat(leftRaw)) ? parseFloat(leftRaw) : -220;
        const right = Number.isFinite(parseFloat(rightRaw)) ? parseFloat(rightRaw) : -220;

        const inLeftX = -left + OFFSET + LEFT_NUDGE;
        const inRightX = right + OFFSET + RIGHT_NUDGE;
        const inY = DEER_Y_NUDGE;

        return { inLeftX, inRightX, inY };
    }

    // ====== Counter animation ======
    async function animateCountTo(el, from, to, duration, digits = 7, easing = (t) => t) {
        const start = performance.now();
        setCounter(el, from, digits);

        return new Promise((resolve) => {
            const stepAnim = (now) => {
                if (!finalRunning) return resolve();
                const t = Math.min(1, (now - start) / Math.max(1, duration));
                const v = Math.round(from + (to - from) * easing(t));
                setCounter(el, v, digits);
                if (t >= 1) return resolve();
                requestAnimationFrame(stepAnim);
            };
            requestAnimationFrame(stepAnim);
        });
    }

    function easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function wait(ms) {
        return new Promise((r) => window.setTimeout(r, ms));
    }

    // ====== Slam helper (so it retriggers every time) ======
    async function slamBox(el) {
        if (!el) return;
        // restart animation reliably
        el.classList.remove("is-slam");
        // force reflow to restart animation
        void el.offsetWidth;
        el.classList.add("is-slam");
        playSfx("boxshmyak", { restart: true });
        // remove class after it ends so it can be triggered again
        window.setTimeout(() => {
            try { el.classList.remove("is-slam"); } catch { /* ignore */ }
        }, SLAM_DUR_MS + 30);
        await wait(SLAM_DUR_MS);
    }

    // ============================================================
    // ====================== FINAL TIMELINE =======================
    // ============================================================
    async function timelineKevinWins(targetKevin, targetBandits) {
        if (!finalRunning) return;

        // ===== RESET VISUALS to EMPTY =====
        rsRoot.className = "rs is-on";
        hideCounts();

        // hide everything
        deerLeft.style.opacity = "0";
        deerRight.style.opacity = "0";
        cauldron.style.opacity = "0";
        pipeLeft.style.opacity = "0";
        pipeRight.style.opacity = "0";
        boxes.style.opacity = "0";
        dynamite.style.opacity = "0";
        if (winnerLayer) winnerLayer.style.opacity = "0";
        if (coinsLayer) coinsLayer.innerHTML = "";

        // reset images
        setBgFromData(deerLeft, "closed");
        setBgFromData(deerRight, "closed");
        setBgFromData(pipeLeft, "a");
        setBgFromData(pipeRight, "a");
        setBgFromData(boxKevin, "closed"); // wbk
        setBgFromData(boxBandits, "closed"); // wbb

        if (boxKevin) boxKevin.classList.remove("is-slam");
        if (boxBandits) boxBandits.classList.remove("is-slam");
        if (boxes) boxes.classList.remove("is-pulse");

        setCounter(countKevin, 0, 7);
        setCounter(countBandits, 0, 7);

        await wait(220);

        // ===== STEP 1: Deer slide in + cauldron appears =====
        rsRoot.classList.add("show-deer", "show-cauldron");
        deerLeft.style.opacity = "1";
        deerRight.style.opacity = "1";
        cauldron.style.opacity = "1"; // cauldron stays

        const deerEdge = getDeerEdgeInX();
        const deerInLeftX = deerEdge.inLeftX;
        const deerInRightX = deerEdge.inRightX;
        const deerInY = deerEdge.inY;
        const deerInDur = 1450;

        deerLeft.animate(
            [{ transform: "translateX(0px) translateY(0px)" }, { transform: `translateX(${deerInLeftX}px) translateY(${deerInY}px)` }], { duration: deerInDur, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
        );
        deerRight.animate(
            [{ transform: "translateX(0px) translateY(0px)" }, { transform: `translateX(${deerInRightX}px) translateY(${deerInY}px)` }], { duration: deerInDur, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
        );

        await wait(deerInDur + 160);

        if (TUNE_MODE) return;

        // ===== STEP 2: Mouths open + coins rain (5s) + sound =====
        setBgFromData(deerLeft, "open");
        setBgFromData(deerRight, "open");

        playSfx("olenmoneta", { restart: true });

        const caulCenter = rectCenterIn(cauldron, rsRoot);
        const toX1 = caulCenter.x - 18;
        const toX2 = caulCenter.x + 18;
        const toY = caulCenter.y - 28;

        coinTimer = window.setInterval(() => {
            if (!finalRunning) return;

            const leftC = rectCenterIn(deerLeft, rsRoot);
            const rightC = rectCenterIn(deerRight, rsRoot);

            const fromLeftX = leftC.x + 78;
            const fromLeftY = leftC.y + 46;

            const fromRightX = rightC.x - 78;
            const fromRightY = rightC.y + 46;

            spawnCoin(fromLeftX, fromLeftY, toX1, toY, 900);
            spawnCoin(fromRightX, fromRightY, toX2, toY, 900);
        }, 155);

        await wait(5000);

        // ===== STEP 3: coins stop, mouths close, deer slide OUT =====
        if (coinTimer) window.clearInterval(coinTimer);
        coinTimer = null;
        stopSfx("olenmoneta");

        setBgFromData(deerLeft, "closed");
        setBgFromData(deerRight, "closed");

        const outDur = 900;
        deerLeft.animate(
            [{ transform: `translateX(${deerInLeftX}px) translateY(${deerInY}px)` }, { transform: "translateX(0px) translateY(0px)" }], { duration: outDur, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
        );
        deerRight.animate(
            [{ transform: `translateX(${deerInRightX}px) translateY(${deerInY}px)` }, { transform: "translateX(0px) translateY(0px)" }], { duration: outDur, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
        );

        await wait(outDur);
        deerLeft.style.opacity = "0";
        deerRight.style.opacity = "0";
        rsRoot.classList.remove("show-deer");

        // ===== STEP 4: Pipes + boxes area appear (boxes slam one by one) =====
        rsRoot.classList.add("show-pipes", "show-boxes");
        pipeLeft.style.opacity = "1";
        pipeRight.style.opacity = "1";
        boxes.style.opacity = "1";

        // CLOSED boxes as base
        setBgFromData(boxKevin, "closed");
        setBgFromData(boxBandits, "closed");
        hideCounts();

        // Slam left then right (1s gap)
        await slamBox(boxKevin);
        await wait(Math.max(0, SLAM_GAP_MS - SLAM_DUR_MS));
        await slamBox(boxBandits);

        // small buffer so second slam settles
        await wait(40);

        // ===== STEP 5: Pump 4s + sound =====
        startPipeAnim();

        playSfx("boxcoins", { restart: true });
        boxes.classList.add("is-pulse");
        await wait(4000);
        boxes.classList.remove("is-pulse");
        stopSfx("boxcoins");

        // ===== STEP 6: Stop pipe animation =====
        stopPipeAnim();
        setBgFromData(pipeLeft, "a");
        setBgFromData(pipeRight, "a");

        // ===== STEP 7: after pump -> play open coin sound, wait 0.5s, then open + show counts =====
        playSfx("boxopencoin", { restart: true });
        await wait(OPEN_AFTER_PUMP_DELAY_MS);

        // now open boxes + show labels/counters
        showCounts();
        setBgFromData(boxKevin, "open"); // wbk1
        setBgFromData(boxBandits, "open"); // wbb1

        await wait(120);

        // ===== STEP 8: Count totals 5s + summa x2 =====
        playSfx("summa", { restart: true });
        window.setTimeout(() => { if (finalRunning) playSfx("summa", { restart: true }); }, 2400);

        await Promise.all([
            animateCountTo(countKevin, 0, targetKevin, 5000, 7, easeInOutQuad),
            animateCountTo(countBandits, 0, targetBandits, 5000, 7, easeInOutQuad),
        ]);

        // ===== STEP 12: Dynamite chain (0.5s gaps) =====
        rsRoot.classList.add("show-dynamite");
        dynamite.style.opacity = "1";

        dynamite.animate(
            [{ transform: "translateX(-50%) scale(0.90)" }, { transform: "translateX(-50%) scale(0.98)" }], { duration: 220, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
        );

        await playSfx("shmiak", { restart: true });
        await wait(500);

        await playSfx("dontPush", { restart: true });
        await wait(500);

        await playSfx("tiktak", { restart: true });
        await wait(2000);

        // FLASH + BULK simultaneously
        flashOnce(170);
        playSfx("bulk", { restart: true });

        rsRoot.classList.add("is-shake");
        await wait(420);
        rsRoot.classList.remove("is-shake");

        // After flash: hide dynamite, cauldron, pipes, boxes
        dynamite.style.opacity = "0";
        cauldron.style.opacity = "0";
        pipeLeft.style.opacity = "0";
        pipeRight.style.opacity = "0";
        boxes.style.opacity = "0";

        // ===== Winner =====
        await wait(350);

        rsRoot.classList.add("show-winner");
        if (winnerLayer) winnerLayer.style.opacity = "1";
        if (fireworks) fireworks.style.opacity = "1";
        if (winText) winText.style.opacity = "1";
        if (winnerAvatars) winnerAvatars.style.opacity = "1";
        if (winnerSprite) winnerSprite.style.opacity = "1";

        if (fireworks) {
            fireworks.animate([{ opacity: 0.0 }, { opacity: 0.85 }, { opacity: 0.25 }], {
                duration: 1200,
                iterations: 999,
                easing: "ease-in-out",
            });
        }

        playSfx("watc", { restart: true });
        startKevinSprite();

        flashOnce(110);
    }

    // ====== BOOT ======
    (async() => {
        try {
            players = await loadPlayers();
            mountCards();
            hideStatus();
            updateMode();
        } catch (err) {
            showStatus("Помилка завантаження. Перевір доступ до Google Sheet.");
            players = [];
            mountCards();
            updateMode();
        }
    })();
})();