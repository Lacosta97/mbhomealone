(() => {
    "use strict";

    // ====== GOOGLE SHEET ======
    const PUBHTML_URL =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtWbgxyuW-7Dr8wSuY3Zq2giptTNS4V31mf_tryTyHUPXPrnZLalThAjCfa_YBMGRl9aNmQOe3mHuU/pubhtml";
    const SHEET_CSV_URL = PUBHTML_URL.replace(/\/pubhtml.*$/i, "/pub?output=csv");

    // ====== PATHS (IMPORTANT: this file runs from results/cards.html) ======
    const AVATAR_BASE = "../img/avatars/"; // CODE.png
    const AVATAR_GUEST = "GUEST.png";

    // Team icons (results/img/icons)
    const TEAM_BADGES = {
        bandits: "./img/icons/team-bandits.png",
        boss: "./img/icons/team-boss.png",
        kevin: "./img/icons/team-kevin.png",
    };

    // Final scene assets (results/img/final)
    const FINAL_ASSETS = {
        coin: "./img/final/coin.png",

        // Boxes:
        boxK_closed: "./img/final/wbk.png",
        boxB_closed: "./img/final/wbb.png",
        boxK_open: "./img/final/wbk1.png",
        boxB_open: "./img/final/wbb1.png",

        dynamite: "./img/final/dynamite.png",
    };

    // Audio (mbhomealone/audio -> from results/ it's ../audio)
    const AUDIO = {
        shmiak: "../audio/shmiak.mp3",
        dontpush: "../audio/dont-push-guest.mp3",
        tiktak: "../audio/tiktak.mp3",
        bulk: "../audio/bulk.mp3",
        watc: "../audio/watc.mp3",
    };

    // ====== SETTINGS ======
    const STORAGE_KEY = "mbha_cards_opened_v2";
    const LIMIT = 18;

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

    // RESULTS
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
    const bottles = document.getElementById("bottles"); // we keep ID, but now it's boxes container
    const bottleKevin = document.getElementById("bottleKevin"); // box K element
    const bottleBandits = document.getElementById("bottleBandits"); // box B element
    const countKevin = document.getElementById("countKevin");
    const countBandits = document.getElementById("countBandits");

    const winnerLayer = document.getElementById("winnerLayer");
    const fireworks = document.getElementById("fireworks");
    const winnerSprite = document.getElementById("winnerSprite");
    const winText = document.getElementById("winText");
    const winnerAvatars = document.getElementById("winnerAvatars");
    const flash = document.getElementById("flash");

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

    // Audio instances
    let a_shmiak = null;
    let a_dontpush = null;
    let a_tiktak = null;
    let a_bulk = null;
    let a_watc = null;

    // ====== Anti-zoom (Safari) ======
    document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
    document.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: false });
    document.addEventListener("gestureend", (e) => e.preventDefault(), { passive: false });
    document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

    function showStatus(text) {
        if (!status) return;
        status.classList.add("is-on");
        if (statusText) statusText.textContent = text;
    }

    function hideStatus() {
        if (!status) return;
        status.classList.remove("is-on");
    }

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

    // CODE safe
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

    // ====== HELPERS: money ======
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

    // ====== Totals from sheet cells F2 / G2 ======
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

    function escapeAttr(str) {
        return String(str).replaceAll("'", "%27");
    }

    // ====== UI BUILD (cards) ======
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
        if (!track) return;
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
        // TEMP: always show RESULTS for testing
        if (btnResults) btnResults.hidden = false;

        const all = isAllOpened();
        if (btnRoll) btnRoll.hidden = all;
        if (nav) nav.hidden = !all;
    }

    // ====== ROLL ======
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

        rolling = true;
        if (btnRoll) btnRoll.hidden = true;
        if (track) track.classList.add("is-rolling");

        const target = pickRandomClosedIndex();
        const N = players.length;

        const extraLoops = 2 + Math.floor(Math.random() * 2);
        let steps = extraLoops * N + mod(target - active, N);

        let delay = 14;
        const delayMax = 70;
        const slowStart = Math.floor(steps * 0.55);
        const totalPlanned = steps;

        const tick = () => {
            active = mod(active + 1, N);
            layout();
            steps--;

            if (steps <= 0) {
                rolling = false;
                active = target;
                layout();
                updateInfo();
                if (track) track.classList.remove("is-rolling");
                return;
            }

            const done = totalPlanned - steps;
            if (done > slowStart) {
                const k = (done - slowStart) / Math.max(1, totalPlanned - slowStart);
                delay = Math.min(delayMax, 14 + k * (delayMax - 14));
            }

            window.setTimeout(tick, delay);
        };

        tick();
    }

    // ====== NAV ======
    function step(dir) {
        const N = players.length;
        active = mod(active + dir, N);
        layout();
    }

    // ====== FX ======
    function burstFx(cardEl, amount) {
        if (!fxLayer) return;
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

    // ====== LOAD PLAYERS ======
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
        results.classList.add("is-open");
        results.setAttribute("aria-hidden", "false");
        startFinalScene().catch(() => stopFinalScene());
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

    // =========================
    // FINAL SCENE (NEW сценарий)
    // =========================
    function hasFinalDOM() {
        return !!(
            rsRoot &&
            deerLeft &&
            deerRight &&
            coinsLayer &&
            cauldron &&
            pipeLeft &&
            pipeRight &&
            bottles &&
            bottleKevin &&
            bottleBandits &&
            countKevin &&
            countBandits &&
            winnerLayer &&
            fireworks &&
            winnerSprite &&
            winText &&
            winnerAvatars &&
            flash
        );
    }

    function clearTimers() {
        if (coinTimer) window.clearInterval(coinTimer);
        if (pipeTimer) window.clearInterval(pipeTimer);
        coinTimer = null;
        pipeTimer = null;
    }

    function stopAllAudio() {
        const arr = [a_shmiak, a_dontpush, a_tiktak, a_bulk, a_watc];
        for (const a of arr) {
            if (!a) continue;
            try {
                a.pause();
                a.currentTime = 0;
            } catch {}
        }
    }

    function ensureAudio() {
        // создаем один раз
        if (!a_shmiak) a_shmiak = new Audio(AUDIO.shmiak);
        if (!a_dontpush) a_dontpush = new Audio(AUDIO.dontpush);
        if (!a_tiktak) a_tiktak = new Audio(AUDIO.tiktak);
        if (!a_bulk) a_bulk = new Audio(AUDIO.bulk);
        if (!a_watc) {
            a_watc = new Audio(AUDIO.watc);
            a_watc.loop = true;
        }

        // громкость (если захочешь — подстроим)
        a_shmiak.volume = 1;
        a_dontpush.volume = 1;
        a_tiktak.volume = 1;
        a_bulk.volume = 1;
        a_watc.volume = 1;
    }

    function setBgFromData(el, which) {
        if (!el) return;
        const key =
            which === "open" || which === "closed" ? which : which === "b" ? "b" : "a";
        const src = el.dataset ? el.dataset[key] : "";
        if (src) el.style.backgroundImage = `url('${src}')`;
    }

    function setBoxesState(state /* "closed" | "open" */ ) {
        if (!bottleKevin || !bottleBandits) return;
        if (state === "open") {
            bottleKevin.style.backgroundImage = `url('${FINAL_ASSETS.boxK_open}')`;
            bottleBandits.style.backgroundImage = `url('${FINAL_ASSETS.boxB_open}')`;
        } else {
            bottleKevin.style.backgroundImage = `url('${FINAL_ASSETS.boxK_closed}')`;
            bottleBandits.style.backgroundImage = `url('${FINAL_ASSETS.boxB_closed}')`;
        }
    }

    function setCounter(el, value, digits = 7) {
        if (!el) return;
        const v = Math.max(0, Math.floor(value));
        el.textContent = String(v).padStart(digits, "0");
    }

    function rectCenterIn(el, root) {
        const r = el.getBoundingClientRect();
        const rr = root.getBoundingClientRect();
        return { x: r.left - rr.left + r.width / 2, y: r.top - rr.top + r.height / 2 };
    }

    function spawnCoin(fromX, fromY, toX, toY, dur = 850) {
        if (!coinsLayer) return;
        const c = document.createElement("div");
        c.className = "rs__coin";
        c.style.backgroundImage = `url('${FINAL_ASSETS.coin}')`;
        c.style.left = `${fromX}px`;
        c.style.top = `${fromY}px`;
        c.style.opacity = "1";

        const rot = (Math.random() * 720 - 360) | 0;
        const midX =
            fromX +
            (toX - fromX) * (0.35 + Math.random() * 0.18) +
            (Math.random() * 70 - 35);
        const midY =
            fromY +
            (toY - fromY) * (0.45 + Math.random() * 0.18) -
            (60 + Math.random() * 70);

        c.animate(
            [
                { transform: `translate(-50%,-50%) rotate(0deg)`, offset: 0 },
                {
                    transform: `translate(${midX - fromX}px, ${midY - fromY}px) rotate(${rot / 2}deg)`,
                    offset: 0.55,
                },
                {
                    transform: `translate(${toX - fromX}px, ${toY - fromY}px) rotate(${rot}deg)`,
                    offset: 1,
                },
            ], { duration: dur, easing: "cubic-bezier(.2,.8,.2,1)" }
        );

        coinsLayer.appendChild(c);
        window.setTimeout(() => c.remove(), dur + 50);
    }

    function flashOnce(ms = 120) {
        if (!flash) return;
        flash.style.opacity = "0";
        flash.animate([{ opacity: 0 }, { opacity: 0.9 }, { opacity: 0 }], {
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

    function startKevinSprite() {
        if (!winnerSprite) return;

        const frames = 6;
        const cols = 3;
        const rows = 2;

        winnerSprite.style.backgroundRepeat = "no-repeat";
        winnerSprite.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;

        let frame = 0;
        const timer = window.setInterval(() => {
            if (!finalRunning) return;
            const f = frame % frames;
            const cx = f % cols;
            const cy = Math.floor(f / cols);
            const x = cols === 1 ? 0 : (cx * 100) / (cols - 1);
            const y = rows === 1 ? 0 : (cy * 100) / (rows - 1);
            winnerSprite.style.backgroundPosition = `${x}% ${y}%`;
            frame++;
        }, 120);

        // сохраняем как "coinTimer" нельзя, поэтому стопаем через finalRunning
        // и дополнительно чистим при stopFinalScene через clearTimers? тут нет.
        // Ок: привяжем к stopFinalScene via finalRunning=false (интервал сам будет жить),
        // но лучше убить:
        const kill = () => window.clearInterval(timer);
        // когда stopFinalScene() дернет finalRunning=false, мы не узнаем.
        // поэтому храним в winnerSprite.dataset
        winnerSprite.dataset._spriteTimer = String(timer);
    }

    function stopSpriteTimerIfAny() {
        if (!winnerSprite) return;
        const id = Number(winnerSprite.dataset._spriteTimer || 0);
        if (id) window.clearInterval(id);
        winnerSprite.dataset._spriteTimer = "";
    }

    // Dynamite element: создаём в rsRoot, чтобы HTML не трогать
    function ensureDynamiteEl() {
        if (!rsRoot) return null;
        let el = rsRoot.querySelector(".rs__dynamite");
        if (!el) {
            el = document.createElement("div");
            el.className = "rs__dynamite";
            el.style.backgroundImage = `url('${FINAL_ASSETS.dynamite}')`;
            rsRoot.appendChild(el);
        } else {
            el.style.backgroundImage = `url('${FINAL_ASSETS.dynamite}')`;
        }
        return el;
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

    function wait(ms) {
        return new Promise((r) => window.setTimeout(r, ms));
    }

    // ====== STOP/RESET FINAL ======
    function stopFinalScene() {
        finalRunning = false;
        clearTimers();
        stopSpriteTimerIfAny();
        stopAllAudio();

        if (!hasFinalDOM()) return;

        // reset classes
        rsRoot.className = "rs";

        // clear coins
        if (coinsLayer) coinsLayer.innerHTML = "";

        // reset opacities
        deerLeft.style.opacity = "0";
        deerRight.style.opacity = "0";
        cauldron.style.opacity = "0";
        pipeLeft.style.opacity = "0";
        pipeRight.style.opacity = "0";
        bottles.style.opacity = "0";

        // reset transforms
        deerLeft.style.transform = "";
        deerRight.style.transform = "";
        cauldron.style.transform = "";
        pipeLeft.style.transform = "";
        pipeRight.style.transform = "";
        bottles.style.transform = "";

        // pipes default frame
        setBgFromData(pipeLeft, "a");
        setBgFromData(pipeRight, "a");

        // deer closed
        setBgFromData(deerLeft, "closed");
        setBgFromData(deerRight, "closed");

        // boxes default (closed)
        setBoxesState("closed");
        bottles.classList.remove("is-pulse");

        // counters reset
        setCounter(countKevin, 0, 7);
        setCounter(countBandits, 0, 7);

        // hide winner
        winnerLayer.style.opacity = "0";
        fireworks.style.opacity = "0";
        winnerSprite.style.opacity = "0";
        winText.style.opacity = "0";
        winnerAvatars.style.opacity = "0";

        // hide flash
        flash.style.opacity = "0";

        // hide dynamite if exists
        const d = rsRoot.querySelector(".rs__dynamite");
        if (d) {
            d.classList.remove("is-on", "is-tick");
            d.style.opacity = "0";
        }
    }

    // ====== FINAL SCENE START ======
    async function startFinalScene() {
        if (!hasFinalDOM()) return;
        if (finalRunning) return;

        finalRunning = true;
        clearTimers();
        stopSpriteTimerIfAny();
        stopAllAudio();
        ensureAudio();

        // base state
        rsRoot.classList.add("is-on");
        setBoxesState("closed");
        bottles.classList.remove("is-pulse");

        // show nothing yet
        deerLeft.style.opacity = "0";
        deerRight.style.opacity = "0";
        cauldron.style.opacity = "0";
        pipeLeft.style.opacity = "0";
        pipeRight.style.opacity = "0";
        bottles.style.opacity = "0";

        winnerLayer.style.opacity = "0";
        fireworks.style.opacity = "0";
        winnerSprite.style.opacity = "0";
        winText.style.opacity = "0";
        winnerAvatars.style.opacity = "0";

        // totals
        let totals = null;
        try {
            totals = await fetchTotalsFromSheetCells();
        } catch {
            totals = null;
        }
        if (!totals) totals = computeTeamTotalsFromPlayers();

        const targetKevin = Math.max(0, totals.kevin || 0);
        const targetBandits = Math.max(0, totals.bandits || 0);

        renderWinnerAvatars();

        // RUN сценарий
        await timelineScenario(targetKevin, targetBandits);
    }

    // ====== MAIN TIMELINE ======
    function getDeerInTransforms() {
        // Use your tuned magic values like before
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

        return { inLeftX, inRightX, inY: DEER_Y_NUDGE };
    }

    async function timelineScenario(targetKevin, targetBandits) {
        // 0) small delay
        await wait(120);
        if (!finalRunning) return;

        // 1) DARK. Deer slide in + cauldron appears. Coins to cauldron 5s, then deer close and slide out.
        deerLeft.style.opacity = "1";
        deerRight.style.opacity = "1";
        setBgFromData(deerLeft, "closed");
        setBgFromData(deerRight, "closed");

        const { inLeftX, inRightX, inY } = getDeerInTransforms();
        const deerInDur = 1100;

        deerLeft.animate(
            [
                { transform: "translateX(0px) translateY(0px)" },
                { transform: `translateX(${inLeftX}px) translateY(${inY}px)` },
            ], { duration: deerInDur, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
        );
        deerRight.animate(
            [
                { transform: "translateX(0px) translateY(0px)" },
                { transform: `translateX(${inRightX}px) translateY(${inY}px)` },
            ], { duration: deerInDur, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
        );

        await wait(deerInDur + 120);
        if (!finalRunning) return;

        cauldron.style.opacity = "1";
        cauldron.animate(
            [{ transform: "translateX(-50%) scale(.985)" }, { transform: "translateX(-50%) scale(1)" }], { duration: 380, easing: "ease-out", fill: "forwards" }
        );

        // deer mouths open + coins start
        await wait(160);
        if (!finalRunning) return;

        setBgFromData(deerLeft, "open");
        setBgFromData(deerRight, "open");

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
        }, 145);

        await wait(5000);
        if (!finalRunning) return;

        // stop coins, mouths close, deer slide out
        if (coinTimer) window.clearInterval(coinTimer);
        coinTimer = null;

        setBgFromData(deerLeft, "closed");
        setBgFromData(deerRight, "closed");

        const deerOutDur = 900;
        deerLeft.animate(
            [
                { transform: `translateX(${inLeftX}px) translateY(${inY}px)` },
                { transform: "translateX(0px) translateY(0px)" },
            ], { duration: deerOutDur, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
        );
        deerRight.animate(
            [
                { transform: `translateX(${inRightX}px) translateY(${inY}px)` },
                { transform: "translateX(0px) translateY(0px)" },
            ], { duration: deerOutDur, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
        );

        await wait(deerOutDur + 80);
        if (!finalRunning) return;

        deerLeft.style.opacity = "0";
        deerRight.style.opacity = "0";

        // 2) Pipes appear + boxes closed pulsing
        pipeLeft.style.opacity = "1";
        pipeRight.style.opacity = "1";
        bottles.style.opacity = "1";
        setBoxesState("closed");
        bottles.classList.add("is-pulse");

        startPipeAnim();
        await wait(900);
        if (!finalRunning) return;

        // 3) Switch to open boxes with heaps of coins, counting
        setBoxesState("open");

        // digits chaos (3s) then settle to totals
        const chaosStart = performance.now();
        const chaos = () =>
            new Promise((resolve) => {
                const tick = () => {
                    if (!finalRunning) return resolve();
                    const t = performance.now() - chaosStart;
                    setCounter(countKevin, Math.floor(Math.random() * 9999999), 7);
                    setCounter(countBandits, Math.floor(Math.random() * 9999999), 7);
                    if (t >= 3000) return resolve();
                    window.setTimeout(tick, 70);
                };
                tick();
            });

        await chaos();
        if (!finalRunning) return;

        // smooth count to totals (no blinking/pauses)
        await Promise.all([
            animateCountTo(countKevin, 0, targetKevin, 950, 7),
            animateCountTo(countBandits, 0, targetBandits, 950, 7),
        ]);

        bottles.classList.remove("is-pulse");

        // 4) Dynamite: shmiak -> show dynamite -> dontpush -> tiktak 2s pulse -> flash + bulk
        const dyna = ensureDynamiteEl();
        if (dyna) {
            dyna.classList.remove("is-tick");
            dyna.classList.add("is-on");
            dyna.style.opacity = "1";
        }

        // shmiak
        try {
            a_shmiak.currentTime = 0;
            await a_shmiak.play();
        } catch {}

        // dont-push
        try {
            a_dontpush.currentTime = 0;
            await a_dontpush.play();
        } catch {}

        // tiktak + pulse 2 sec
        if (dyna) dyna.classList.add("is-tick");
        try {
            a_tiktak.currentTime = 0;
            await a_tiktak.play();
        } catch {}

        await wait(2000);
        if (!finalRunning) return;

        if (dyna) dyna.classList.remove("is-tick");

        // flash + bulk
        flashOnce(150);
        try {
            a_bulk.currentTime = 0;
            await a_bulk.play();
        } catch {}

        // hide dynamite fast
        if (dyna) {
            dyna.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-out", fill: "forwards" });
            dyna.style.opacity = "0";
        }

        // 5) Winner finale screen
        // hide previous elements smoothly (keep cauldron in place if хочешь — но ты сказал дальше экран как был)
        // We'll fade pipes/boxes/cauldron:
        cauldron.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "ease-out", fill: "forwards" });
        pipeLeft.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "ease-out", fill: "forwards" });
        pipeRight.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "ease-out", fill: "forwards" });
        bottles.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "ease-out", fill: "forwards" });

        await wait(260);
        if (!finalRunning) return;

        cauldron.style.opacity = "0";
        pipeLeft.style.opacity = "0";
        pipeRight.style.opacity = "0";
        bottles.style.opacity = "0";

        rsRoot.classList.add("show-winner");

        winnerLayer.style.opacity = "1";
        fireworks.style.opacity = "1";
        winText.style.opacity = "1";
        winnerAvatars.style.opacity = "1";
        winnerSprite.style.opacity = "1";

        // fireworks subtle pulse
        fireworks.animate([{ opacity: 0.15 }, { opacity: 0.85 }, { opacity: 0.25 }], {
            duration: 1200,
            iterations: 999,
            easing: "ease-in-out",
        });

        // animate sprite
        startKevinSprite();

        // watc starts and loops (stop on CLOSE)
        try {
            a_watc.currentTime = 0;
            await a_watc.play();
        } catch {}
    }

    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    async function animateCountTo(el, from, to, duration, digits = 7) {
        const start = performance.now();
        setCounter(el, from, digits);

        return new Promise((resolve) => {
            const stepAnim = (now) => {
                if (!finalRunning) return resolve();
                const t = Math.min(1, (now - start) / Math.max(1, duration));
                const eased = easeOutCubic(t);
                const v = Math.round(from + (to - from) * eased);
                setCounter(el, v, digits);
                if (t >= 1) return resolve();
                requestAnimationFrame(stepAnim);
            };
            requestAnimationFrame(stepAnim);
        });
    }

    // ====== BOOT ======
    (async() => {
        try {
            players = await loadPlayers();
            mountCards();
            hideStatus();
        } catch (err) {
            showStatus("Помилка завантаження. Перевір доступ до Google Sheet.");
            players = [];
            mountCards();
        }
    })();
})();