(() => {
    "use strict";

    const SHEET_URL =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtWbgxyuW-7Dr8wSuY3Zq2giptTNS4V31mf_tryTyHUPXPrnZLalThAjCfa_YBMGRl9aNmQOe3mHuU/pub?output=csv";

    const STORAGE_KEY = "mbha_cards_opened_v2";
    const GAP = 220;
    const LIMIT = 18;

    const track = document.getElementById("carouselTrack");
    const viewport = document.getElementById("carouselViewport");
    const status = document.getElementById("status");
    const statusText = document.getElementById("statusText");
    const countTotal = document.getElementById("countTotal");
    const countOpened = document.getElementById("countOpened");
    const btnReset = document.getElementById("btnReset");
    const fxLayer = document.getElementById("fxLayer");

    const opened = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    let cards = [];
    let pos = 0,
        vel = 0,
        drag = false,
        lastX = 0;

    function show(t) { status.classList.add("is-on");
        statusText.textContent = t }

    function hide() { status.classList.remove("is-on") }

    function avatar(code) {
        return code ? `../img/avatars/${code}.png` : `../img/avatars/GUEST.png`;
    }

    function createCard({ CODE, NAME, TEAM }) {
        const el = document.createElement("button");
        el.className = "card";
        el.innerHTML = `
      <div class="card__inner">
        <div class="face back"></div>
        <div class="face front">
          <div class="front__img" style="background-image:url('${avatar(CODE)}')"></div>
          <div class="front__overlay"></div>
          <div class="front__meta">
            <div class="name">${NAME || "Гість"}</div>
            <img src="./img/icons/team-${TEAM?.toLowerCase().includes("kevin")?"kevin":TEAM?.toLowerCase().includes("band")?"bandits":"boss"}.png">
          </div>
        </div>
      </div>
      <div class="card__frame"></div>
    `;
        if (opened.has(CODE)) el.classList.add("is-open");

        el.onclick = () => {
            if (el !== centerCard()) return;
            if (opened.has(CODE)) return;

            opened.add(CODE);
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...opened]));
            countOpened.textContent = opened.size;

            const p = document.createElement("div");
            p.className = "portal";
            el.appendChild(p);
            setTimeout(() => p.remove(), 400);

            el.classList.add("is-open");
            burst(el);
        };
        return el;
    }

    function burst(card) {
        const r = card.getBoundingClientRect();
        for (let i = 0; i < 10; i++) {
            const f = document.createElement("div");
            f.className = "fx";
            f.style.left = r.left + r.width / 2 + "px";
            f.style.top = r.top + r.height / 2 + "px";
            f.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
            f.style.setProperty("--dy", (Math.random() * 120 - 60) + "px");
            fxLayer.appendChild(f);
            setTimeout(() => f.remove(), 700);
        }
    }

    function layout() {
        const rect = viewport.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const total = cards.length;

        cards.forEach((c, i) => {
            let x = i * GAP - pos;
            const loop = total * GAP;
            x = ((x + loop / 2) % loop) - loop / 2;

            const cx = rect.left + rect.width / 2;
            const dx = x + rect.width / 2 - cx;
            const scale = Math.max(.6, 1 - Math.abs(dx) / 700);

            c.style.transform = `translateX(${x}px) scale(${scale})`;
            c.style.zIndex = Math.round(scale * 100);
        });
    }

    function centerCard() {
        let best = null,
            d = 1e9;
        const rect = viewport.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        cards.forEach(c => {
            const r = c.getBoundingClientRect();
            const cd = Math.abs(r.left + r.width / 2 - center);
            if (cd < d) { d = cd;
                best = c }
        });
        return best;
    }

    function animate() {
        if (!drag) {
            pos += vel;
            vel *= .92;
            if (Math.abs(vel) < .1) vel = 0;
        }
        layout();
        requestAnimationFrame(animate);
    }

    track.addEventListener("pointerdown", e => {
        drag = true;
        lastX = e.clientX;
        vel = 0;
    });
    window.addEventListener("pointermove", e => {
        if (!drag) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        pos -= dx;
        vel = -dx;
    });
    window.addEventListener("pointerup", () => drag = false);

    btnReset.onclick = () => {
        localStorage.removeItem(STORAGE_KEY);
        opened.clear();
        cards.forEach(c => c.classList.remove("is-open"));
        countOpened.textContent = "0";
    };

    async function load() {
        show("Завантажую гравців…");
        const csv = await (await fetch(SHEET_URL)).text();
        csv.split("\n").slice(1, LIMIT + 1).forEach(r => {
            const [CODE, NAME, TEAM] = r.split(",");
            const c = createCard({ CODE, NAME, TEAM });
            cards.push(c);
            track.appendChild(c);
        });
        countTotal.textContent = cards.length;
        countOpened.textContent = opened.size;
        hide();
        animate();
    }

    load().catch(() => show("Помилка завантаження"));
})();