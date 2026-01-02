(() => {
    "use strict";

    const PUBHTML_URL =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtWbgxyuW-7Dr8wSuY3Zq2giptTNS4V31mf_tryTyHUPXPrnZLalThAjCfa_YBMGRl9aNmQOe3mHuU/pubhtml";
    const SHEET_CSV_URL = PUBHTML_URL.replace(/\/pubhtml.*$/i, "/pub?output=csv");

    const ASSETS = {
        fxSparkle: "./img/fx/sparkle.png",
        fxDust: "./img/fx/dust.png",
        avatarBase: "../img/avatars/",
        avatarExt: ".png",
        avatarGuest: "GUEST.png",
    };

    const STORAGE_KEY = "mbha_cards_opened_v2";
    const LIMIT = 18;

    const track = document.getElementById("carouselTrack");
    const fxLayer = document.getElementById("fxLayer");
    const status = document.getElementById("status");
    const statusText = document.getElementById("statusText");
    const countTotal = document.getElementById("countTotal");
    const countOpened = document.getElementById("countOpened");
    const btnReset = document.getElementById("btnReset");

    const opened = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));

    let cards = [];
    let pos = 0,
        vel = 0,
        dragging = false,
        lastX = 0;
    const CARD_GAP = 260;

    function showStatus(t) { status.classList.add("is-on");
        statusText.textContent = t }

    function hideStatus() { status.classList.remove("is-on") }

    function avatarFor(code) {
        if (!code || code.toUpperCase() === "GUEST") return ASSETS.avatarBase + ASSETS.avatarGuest;
        return ASSETS.avatarBase + code + ASSETS.avatarExt;
    }

    function createCard({ CODE, NAME, TEAM }) {
        const el = document.createElement("button");
        el.className = "card";
        el.innerHTML = `
      <div class="card__inner">
        <div class="face back"></div>
        <div class="face front">
          <div class="front__img" style="background-image:url('${avatarFor(CODE)}')"></div>
          <div class="front__overlay"></div>
          <div class="front__meta">
            <div class="name">${NAME || "Гість"}</div>
            <div class="teamline">${TEAM || ""}</div>
          </div>
        </div>
      </div>
      <div class="card__frame"></div>
      <div class="card__shine"></div>
    `;
        if (opened.has(CODE)) el.classList.add("is-open");

        el.addEventListener("click", () => {
            if (getCenterCard() !== el) return;
            if (opened.has(CODE)) return;
            openCard(el, CODE);
        });
        return el;
    }

    function openCard(el, code) {
        opened.add(code);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...opened]));
        countOpened.textContent = opened.size;

        const p = document.createElement("div");
        p.className = "portal";
        el.appendChild(p);
        setTimeout(() => p.remove(), 400);

        el.classList.add("is-open");
        burstFx(el, 18);
    }

    function burstFx(cardEl, amount) {
        const r = cardEl.getBoundingClientRect();
        const cx = r.left + r.width / 2,
            cy = r.top + r.height / 2;
        for (let i = 0; i < amount; i++) {
            const p = document.createElement("div");
            p.className = "fx";
            const img = document.createElement("img");
            img.src = i % 2 ? ASSETS.fxDust : ASSETS.fxSparkle;
            p.appendChild(img);
            p.style.left = cx + "px";
            p.style.top = cy + "px";
            fxLayer.appendChild(p);
            setTimeout(() => p.remove(), 700);
        }
    }

    function layout() {
        cards.forEach((c, i) => {
            const x = i * CARD_GAP - pos;
            const center = window.innerWidth / 2;
            const dx = x + CARD_GAP / 2 - center;
            const s = Math.max(.6, 1 - Math.abs(dx) / 800);
            c.style.transform = `translateX(${x}px) scale(${s})`;
            c.style.zIndex = Math.round(s * 100);
        });
    }

    function getCenterCard() {
        let best = null,
            bd = 1e9;
        cards.forEach(c => {
            const r = c.getBoundingClientRect();
            const d = Math.abs(r.left + r.width / 2 - window.innerWidth / 2);
            if (d < bd) { bd = d;
                best = c }
        });
        return best;
    }

    function animate() {
        if (!dragging) {
            pos += vel;
            vel *= .92;
            if (Math.abs(vel) < .1) {
                const i = Math.round(pos / CARD_GAP);
                pos = i * CARD_GAP;
                vel = 0;
            }
        }
        layout();
        requestAnimationFrame(animate);
    }

    track.addEventListener("pointerdown", e => {
        dragging = true;
        lastX = e.clientX;
        vel = 0;
    });
    window.addEventListener("pointermove", e => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        pos -= dx;
        vel = -dx;
    });
    window.addEventListener("pointerup", () => dragging = false);

    btnReset.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEY);
        opened.clear();
        cards.forEach(c => c.classList.remove("is-open"));
        countOpened.textContent = "0";
    });

    async function load() {
        showStatus("Завантажую гравців…");
        const csv = await (await fetch(SHEET_CSV_URL)).text();
        const rows = csv.split("\n").slice(1).map(r => r.split(","));
        rows.slice(0, LIMIT).forEach(r => {
            const card = createCard({ CODE: r[0], NAME: r[1], TEAM: r[2] });
            cards.push(card);
            track.appendChild(card);
        });
        countTotal.textContent = cards.length;
        countOpened.textContent = opened.size;
        hideStatus();
        animate();
    }

    load().catch(e => {
        showStatus("Помилка завантаження");
    });
})();