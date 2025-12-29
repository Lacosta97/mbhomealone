(() => {
    "use strict";

    // ====== GOOGLE SHEET (твоя ссылка) ======
    const PUBHTML_URL =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtWbgxyuW-7Dr8wSuY3Zq2giptTNS4V31mf_tryTyHUPXPrnZLalThAjCfa_YBMGRl9aNmQOe3mHuU/pubhtml";

    // Если нужно указать конкретную вкладку — впиши gid (иначе будет первая опубликованная)
    const SHEET_GID = ""; // например "0"

    // Автоматически строим CSV URL из pubhtml (ничего руками не надо)
    const SHEET_CSV_URL = (() => {
        const base = PUBHTML_URL.replace(/\/pubhtml.*$/i, "/pub?output=csv");
        if (!SHEET_GID) return base;
        return base + "&gid=" + encodeURIComponent(SHEET_GID);
    })();

    // ====== ПУТИ ПОД ТВОЮ СТРУКТУРУ ======
    // cards.* лежат в /results/
    // ассеты в /results/img/...
    // аватары в /img/avatars/...
    const ASSETS = {
        frame: "./img/ui/card-frame.png",
        fxSparkle: "./img/fx/sparkle.png",
        fxDust: "./img/fx/dust.png",
        avatarBase: "../img/avatars/", // {CODE}.png
        avatarExt: ".png",
        avatarGuest: "GUEST.png",
    };

    // ====== НАСТРОЙКИ ======
    const STORAGE_KEY = "mbha_cards_opened_v2";
    const LIMIT_CARDS = 18;

    // ====== DOM ======
    const grid = document.getElementById("cardsGrid");
    const fxLayer = document.getElementById("fxLayer");
    const countTotal = document.getElementById("countTotal");
    const countOpened = document.getElementById("countOpened");
    const btnReset = document.getElementById("btnReset");
    const status = document.getElementById("status");
    const statusText = document.getElementById("statusText");

    // ====== local opened ======
    function loadOpened() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return new Set();
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return new Set();
            return new Set(arr.filter(x => typeof x === "string"));
        } catch {
            return new Set();
        }
    }

    function saveOpened(set) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    }
    const opened = loadOpened();

    function updateCounters(total) {
        countTotal.textContent = String(total);
        countOpened.textContent = String(opened.size);
    }

    // ====== UI helpers ======
    function showStatus(text) {
        status.classList.add("is-on");
        statusText.textContent = text;
    }

    function hideStatus() {
        status.classList.remove("is-on");
    }

    function normTeam(raw) {
        const t = String(raw || "").trim().toLowerCase();
        // В твоём шите: "Team Kevin", "Team Bandits", "Team Boss"
        if (t.includes("kevin")) return { label: "TEAM KEVIN", good: true };
        if (t.includes("band")) return { label: "TEAM BANDITS", good: false };
        if (t.includes("boss")) return { label: "TEAM BOSS", good: false };
        return { label: String(raw || "TEAM").toUpperCase(), good: false };
    }

    function avatarForCode(code) {
        const c = String(code || "").trim();
        if (!c) return ASSETS.avatarBase + ASSETS.avatarGuest;
        if (c.toUpperCase() === "GUEST") return ASSETS.avatarBase + ASSETS.avatarGuest;
        return ASSETS.avatarBase + c + ASSETS.avatarExt;
    }

    // ====== CSV parsing (нормальный, с кавычками) ======
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
                if (ch === '"') {
                    inQuotes = true;
                } else if (ch === ",") {
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

        // trim empty tail rows
        return rows.filter(r => r.some(cell => String(cell).trim() !== ""));
    }

    function rowsToObjects(rows) {
        if (!rows.length) return [];
        const headers = rows[0].map(h => String(h).trim().toUpperCase());
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

    // ====== render card ======
    function createCard({ CODE, NAME, TEAM }) {
        const code = String(CODE || "").trim();
        const name = String(NAME || "").trim();
        const teamInfo = normTeam(TEAM);

        const pillClass = teamInfo.good ? "pill good" : "pill";

        const el = document.createElement("button");
        el.type = "button";
        el.className = "card";
        el.dataset.code = code;
        el.setAttribute("aria-label", `Карта: ${code}`);

        el.innerHTML = `
      <div class="card__inner">
        <div class="face back">
          <div class="back__stamp">
            <div class="back__logo">MBHA</div>
            <div class="back__sub">tap to flip</div>
          </div>
        </div>

        <div class="face front">
          <div class="front__img" style="background-image:url('${escapeAttr(avatarForCode(code))}')"></div>
          <div class="front__overlay"></div>

          <div class="code-badge">${escapeHtml(code)}</div>

          <div class="front__meta">
            <div class="name">${escapeHtml(name || code)}</div>
            <div class="teamline">
              <span class="${pillClass}">
                <span class="pill__dot"></span>
                <span>${escapeHtml(teamInfo.label)}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="card__frame" style="background-image:url('${escapeAttr(ASSETS.frame)}')"></div>
      <div class="card__shine"></div>
    `;

        if (opened.has(code)) el.classList.add("is-open");

        el.addEventListener("click", (e) => {
            e.preventDefault();
            flipCard(el);
        });

        return el;
    }

    function flipCard(el) {
        const code = el.dataset.code;
        if (!code) return;

        // уже открыта — не закрываем
        if (opened.has(code)) {
            burstFx(el, 10);
            return;
        }

        opened.add(code);
        saveOpened(opened);
        countOpened.textContent = String(opened.size);

        el.classList.add("is-opening");
        setTimeout(() => el.classList.remove("is-opening"), 430);

        el.classList.add("is-open");
        burstFx(el, 18);
    }

    function burstFx(cardEl, amount = 16) {
        const rect = cardEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        for (let i = 0; i < amount; i++) {
            const isSparkle = i % 2 === 0;

            const p = document.createElement("div");
            p.className = "fx";

            const size = isSparkle ? (18 + Math.random() * 14) : (10 + Math.random() * 10);
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;

            const img = document.createElement("img");
            img.alt = "";
            img.decoding = "async";
            img.loading = "eager";
            img.src = isSparkle ? ASSETS.fxSparkle : ASSETS.fxDust;
            p.appendChild(img);

            const ang = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 70;

            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist - (10 + Math.random() * 20);

            const s = isSparkle ? (0.9 + Math.random() * 0.9) : (0.7 + Math.random() * 0.6);
            const rot = `${Math.floor(Math.random() * 240 - 120)}deg`;

            p.style.setProperty("--dx", `${dx}px`);
            p.style.setProperty("--dy", `${dy}px`);
            p.style.setProperty("--s", String(s));
            p.style.setProperty("--rot", rot);

            p.style.left = `${cx}px`;
            p.style.top = `${cy}px`;
            p.style.animationDelay = `${Math.random() * 70}ms`;

            fxLayer.appendChild(p);
            setTimeout(() => p.remove(), 820);
        }
    }

    // ====== boot ======
    async function loadPlayers() {
        showStatus("Загружаю игроков из Google Sheet…");

        const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("Sheet fetch failed: " + res.status);

        const csv = await res.text();
        const rows = parseCSV(csv);
        const objs = rowsToObjects(rows);

        // ожидаем CODE/NAME/TEAM
        const filtered = objs
            .filter(o => String(o.CODE || "").trim() !== "")
            .slice(0, LIMIT_CARDS);

        return filtered;
    }

    function render(cards) {
        grid.innerHTML = "";
        for (const c of cards) grid.appendChild(createCard(c));
        updateCounters(cards.length);
    }

    btnReset.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEY);
        opened.clear();

        // снять классы, не перерисовывая
        document.querySelectorAll(".card.is-open").forEach(el => el.classList.remove("is-open"));
        countOpened.textContent = "0";
    });

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

    (async() => {
        try {
            const cards = await loadPlayers();
            render(cards);
            hideStatus();
        } catch (err) {
            showStatus("Ошибка загрузки Google Sheet. Проверь Publish и доступ. (" + String(err && err.message ? err.message : err) + ")");
            // всё равно покажем пусто, но счетчики будут честные
            render([]);
        }
    })();
})();