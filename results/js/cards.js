(() => {
    "use strict";

    // ====== GOOGLE SHEET ======
    const PUBHTML_URL =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtWbgxyuW-7Dr8wSuY3Zq2giptTNS4V31mf_tryTyHUPXPrnZLalThAjCfa_YBMGRl9aNmQOe3mHuU/pubhtml";
    const SHEET_CSV_URL = PUBHTML_URL.replace(/\/pubhtml.*$/i, "/pub?output=csv");

    // ====== PATHS ======
    const AVATAR_BASE = "../img/avatars/"; // {CODE}.png
    const AVATAR_GUEST = "GUEST.png";

    // team badges
    const TEAM_BADGES = {
        bandits: "../img/team-bandits.png",
        boss: "../img/team-boss.png",
        kevin: "../img/team-kevin.png",
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
    const infoBadge = document.getElementById("infoBadge");

    // ====== STATE ======
    const opened = loadOpened();
    let players = [];
    let cardEls = [];
    let active = 0; // індекс по кільцю
    let rolling = false;

    // ====== Anti-zoom (Safari) ======
    // (meta viewport already set; this blocks gesture zoom + dbltap zoom)
    document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
    document.addEventListener("gesturechange", (e) => e.preventDefault(), { passive: false });
    document.addEventListener("gestureend", (e) => e.preventDefault(), { passive: false });
    document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

    // GAP беремо з CSS змінної (менше лагів, ніж хардкодити)
    function getGapPx() {
        const v = getComputedStyle(document.documentElement).getPropertyValue("--gap").trim();
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : 140;
    }

    function showStatus(text) {
        status.classList.add("is-on");
        statusText.textContent = text;
    }

    function hideStatus() {
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

    function avatarFor(code) {
        const c = String(code || "").trim();
        if (!c || c.toUpperCase() === "GUEST") return AVATAR_BASE + AVATAR_GUEST;
        return AVATAR_BASE + c + ".png";
    }

    function normTeamKey(raw) {
        const t = String(raw || "").trim().toLowerCase();
        if (!t) return "kevin";

        // flexible mapping
        if (t.includes("band") || t.includes("банд") || t.includes("wet")) return "bandits";
        if (t.includes("boss") || t.includes("босс") || t.includes("шеф") || t.includes("admin")) return "boss";
        if (t.includes("kevin") || t.includes("кев")) return "kevin";

        if (t === "bandits" || t === "boss" || t === "kevin") return t;
        return "kevin";
    }

    function badgeFor(teamKey) {
        return TEAM_BADGES[teamKey] || TEAM_BADGES.kevin;
    }

    // ====== CSV PARSER (твій нормальний, з кавичками) ======
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
                } else if (ch === '"') inQuotes = false;
                else cur += ch;
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
                    /* ignore */
                } else cur += ch;
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
        el.setAttribute("aria-label", `Карта: ${name}`);

        el.innerHTML = `
      <div class="card__inner">
        <div class="face back"></div>
        <div class="face front">
          <div class="front__img" style="background-image:url('${escapeAttr(avatarFor(code))}')"></div>
          <div class="front__shade"></div>
          <div class="front__meta">
            <div class="name">${escapeHtml(name)}</div>
            <img class="team-badge" src="${escapeAttr(badgeFor(teamKey))}" alt="">
          </div>
        </div>
      </div>
    `;

        if (opened.has(code)) el.classList.add("is-open");

        el.addEventListener(
            "click",
            (e) => {
                e.preventDefault();
                if (rolling) return;

                // відкриваємо тільки центральну
                const centerEl = cardEls[active];
                if (el !== centerEl) return;

                if (opened.has(code)) {
                    burstFx(centerEl, 10);
                    // show info for opened
                    updateInfo();
                    return;
                }

                opened.add(code);
                saveOpened();
                centerEl.classList.add("is-open");
                burstFx(centerEl, 18);

                updateInfo(); // now shows (only after open)
                updateMode();

                // після відкриття — якщо не фінал, ROLL повертається
                if (!isAllOpened()) {
                    btnRoll.hidden = false;
                }
            }, { passive: false }
        );

        return el;
    }

    function mountCards() {
        track.innerHTML = "";
        cardEls = players.map((p) => createCard(p));
        for (const el of cardEls) track.appendChild(el);

        // активну ставимо на першу закриту (щоб не крутився по вже відкритих)
        const firstClosed = players.findIndex((p) => !opened.has(String(p.CODE || "").trim()));
        active = firstClosed >= 0 ? firstClosed : 0;

        layout();
        updateInfo();
        updateMode();
    }

    // ====== LAYOUT (легкий, без лагів) ======
    function mod(n, m) {
        return ((n % m) + m) % m;
    }

    function layout() {
        if (!cardEls.length) return;
        const gap = getGapPx();
        const N = cardEls.length;

        // показуємо лише сусідів на фоні
        const visibleRange = 3; // зліва/справа

        for (let i = 0; i < N; i++) {
            const el = cardEls[i];

            // мінімальна циклічна відстань від активної
            let d = i - active;
            if (d > N / 2) d -= N;
            if (d < -N / 2) d += N;

            // ховаємо далекі (менше DOM роботи + менше лагів)
            if (Math.abs(d) > visibleRange) {
                el.style.opacity = "0";
                el.style.pointerEvents = "none";
                el.style.transform = "translate(-50%,-50%) translateX(0px) scale(0.6)";
                continue;
            }

            el.style.opacity = "1";
            el.style.pointerEvents = "auto";

            const x = d * gap;
            const isCenter = d === 0;

            const scale = isCenter ? 1 : Math.abs(d) === 1 ? 0.86 : 0.74;
            const blur = isCenter ? "none" : "saturate(.9) brightness(.78)";
            el.style.filter = blur;

            el.style.transform = `translate(-50%,-50%) translateX(${x}px) scale(${scale})`;
            el.style.zIndex = String(1000 - Math.abs(d) * 10);
        }
        updateInfo();
    }

    // подпись снизу: появляется только если центральная карта ОТКРЫТА
    function updateInfo() {
        if (!players.length) return;

        const p = players[active];
        const code = String(p.CODE || "").trim();
        const isOpen = opened.has(code);

        if (!isOpen) {
            info.classList.remove("is-on");
            infoName.textContent = "—";
            infoBadge.classList.remove("is-on");
            infoBadge.removeAttribute("src");
            infoBadge.alt = "";
            return;
        }

        const name = String(p.NAME || "Гість").toUpperCase();
        const teamKey = normTeamKey(p.TEAM);

        infoName.textContent = name;
        info.classList.add("is-on");

        infoBadge.src = badgeFor(teamKey);
        infoBadge.alt = "";
        infoBadge.classList.add("is-on");
    }

    function isAllOpened() {
        // рахуємо тільки по тим, що реально завантажили
        const total = players.length || LIMIT;
        return opened.size >= total && total > 0;
    }

    // ====== MODES ======
    function updateMode() {
        const all = isAllOpened();

        // ROLL тільки поки не все відкрите
        btnRoll.hidden = all;

        // Стрілки тільки після фіналу
        nav.hidden = !all;

        // RESET всегда доступен — ничего не скрываем
    }

    // ====== ROLL (ускорили в 2 раза) ======
    function pickRandomClosedIndex() {
        const closed = [];
        for (let i = 0; i < players.length; i++) {
            const code = String(players[i].CODE || "").trim();
            if (!opened.has(code)) closed.push(i);
        }
        if (!closed.length) return active;
        const r = Math.floor(Math.random() * closed.length);
        return closed[r];
    }

    function roll() {
        if (rolling) return;
        if (isAllOpened()) return;

        rolling = true;
        btnRoll.hidden = true;

        // куди маємо зупинитись
        const target = pickRandomClosedIndex();

        // скільки "кроків" прокрутити (для відчуття барабана)
        const N = players.length;
        const extraLoops = 2 + Math.floor(Math.random() * 2); // keep feel
        let steps = extraLoops * N + mod(target - active, N);

        // анімація: швидко → повільно (в 2 раза швидше)
        let delay = 18; // старт (было 30)
        const delayMax = 80; // кінець (было 140)
        const slowStart = Math.floor(steps * 0.65);

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
                // тепер юзер має натиснути по центру
                return;
            }

            // плавне уповільнення
            const done = totalPlanned - steps;
            if (done > slowStart) {
                const k = (done - slowStart) / Math.max(1, totalPlanned - slowStart);
                delay = Math.min(delayMax, 18 + k * (delayMax - 18));
            }

            window.setTimeout(tick, delay);
        };

        tick();
    }

    // ====== NAV (після фіналу) ======
    function step(dir) {
        const N = players.length;
        active = mod(active + dir, N);
        layout();
    }

    // ====== FX (без PNG) ======
    function burstFx(cardEl, amount = 14) {
        const rect = cardEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        for (let i = 0; i < amount; i++) {
            const p = document.createElement("div");
            p.className = "fx-dot";

            const ang = Math.random() * Math.PI * 2;
            const dist = 18 + Math.random() * 62;

            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist - (8 + Math.random() * 14);

            const s = 0.8 + Math.random() * 1.0;

            p.style.setProperty("--dx", `${dx}px`);
            p.style.setProperty("--dy", `${dy}px`);
            p.style.setProperty("--s", String(s));

            p.style.left = `${cx}px`;
            p.style.top = `${cy}px`;

            fxLayer.appendChild(p);
            setTimeout(() => p.remove(), 560);
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

        const filtered = objs
            .filter((o) => String(o.CODE || "").trim() !== "")
            .slice(0, LIMIT);

        return filtered;
    }

    function escapeHtml(str) {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function escapeAttr(str) {
        return String(str).replaceAll("'", "%27");
    }

    // ====== EVENTS ======
    btnRoll.addEventListener("click", roll);
    btnPrev.addEventListener("click", (e) => { e.preventDefault();
        step(-1); }, { passive: false });
    btnNext.addEventListener("click", (e) => { e.preventDefault();
        step(1); }, { passive: false });

    btnReset.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem(STORAGE_KEY);
        opened.clear();
        for (const el of cardEls) el.classList.remove("is-open");
        // повертаємось у режим розкриття
        const firstClosed = players.findIndex((p) => !opened.has(String(p.CODE || "").trim()));
        active = firstClosed >= 0 ? firstClosed : 0;
        layout();
        updateMode();
    }, { passive: false });

    window.addEventListener("resize", () => layout());

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