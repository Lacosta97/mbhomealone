/* ===============================
   MBHA HOLD — sprites + typewriter + SLOT + LEVER
   Kevin walk: IDENTICAL setupKevinWalkProper from main.js
================================ */
(function() {
    // ---------- Digits UI ----------
    function renderDigits(container, text) {
        if (!container) return;
        container.innerHTML = "";
        String(text).split("").forEach((ch) => {
            const d = document.createElement("div");
            d.className = "digit";
            d.textContent = ch;
            container.appendChild(d);
        });
    }

    // default state: all X
    renderDigits(document.getElementById("digitsKevin"), "XXXXXXX");
    renderDigits(document.getElementById("digitsBandits"), "XXXXXXX");

    // ---------- Typewriter ----------
    const typeEl = document.getElementById("typeText");
    const PHASE1 = "Підр...";
    const PHASE2 = "Підрахунок грошенят";

    let current = "";
    let phase = 1;
    let idx = 0;
    let deleting = false;

    function setText(t) {
        current = t;
        if (typeEl) typeEl.textContent = current;
    }

    function tickTypewriter() {
        if (!typeEl) return;

        if (phase === 1) {
            if (!deleting) {
                if (idx < PHASE1.length) {
                    setText(current + PHASE1.charAt(idx));
                    idx++;
                    return;
                }
                deleting = true;
                return;
            } else {
                if (current.length > 0) {
                    setText(current.slice(0, -1));
                    return;
                }
                phase = 2;
                idx = 0;
                deleting = false;
                return;
            }
        }

        if (phase === 2) {
            if (idx < PHASE2.length) {
                setText(current + PHASE2.charAt(idx));
                idx++;
                return;
            }
            phase = 3;
            return;
        }

        if (phase === 3) {
            phase = 4;
            return;
        }

        if (phase === 4) {
            if (current.length > 0) {
                setText(current.slice(0, -1));
                return;
            }
            phase = 1;
            idx = 0;
            deleting = false;
        }
    }

    function startTypewriter() {
        setText("");
        idx = 0;
        phase = 1;
        deleting = false;

        const base = 55;
        const del = 40;

        (function loop() {
            let t = base;

            if (phase === 1 && deleting) t = del;
            if (phase === 4) t = del;

            if (phase === 1 && !deleting && idx === PHASE1.length) t = 650;
            if (phase === 3) t = 800;

            tickTypewriter();
            setTimeout(loop, t);
        })();
    }

    // ---------- Simple frame anim for Marv/Harry ----------
    function pad2(n) { return String(n).padStart(2, "0"); }

    function animateLoop(imgEl, folder, prefix, framesCount, speedMs) {
        if (!imgEl) return;
        let frame = 1;

        for (let i = 1; i <= framesCount; i++) {
            const im = new Image();
            im.src = `img/sprites/${folder}/${prefix}_${pad2(i)}.png`;
        }

        imgEl.src = `img/sprites/${folder}/${prefix}_${pad2(frame)}.png`;
        setInterval(() => {
            frame = frame < framesCount ? frame + 1 : 1;
            imgEl.src = `img/sprites/${folder}/${prefix}_${pad2(frame)}.png`;
        }, speedMs);
    }

    // ---------- Kevin: IDENTICAL function from main.js ----------
    function setupKevinWalkProper(wrapperSelector) {
        const wrapper = document.querySelector(wrapperSelector);
        if (!wrapper) return;

        const img = wrapper.querySelector("img");
        if (!img) return;

        function kevinSrc(n) {
            return `img/sprites/kevin/kevin_idle_${String(n).padStart(2, "0")}.png`;
        }

        const FRAMES_IDLE_CENTER = [1, 2];
        const FRAMES_WALK_RIGHT = [3, 4];
        const FRAMES_IDLE_RIGHT = [6, 7];
        const FRAMES_WALK_LEFT = [8, 9];

        const computed = getComputedStyle(wrapper);
        const baseLeft = parseFloat(computed.left) || 0;

        let offset = 0;
        const STEP_PX = 3;
        const MAX_OFFSET = 22;

        const SPEED = 120;

        const STATE_IDLE_CENTER = 0;
        const STATE_WALK_RIGHT = 1;
        const STATE_IDLE_RIGHT = 2;
        const STATE_WALK_LEFT = 3;

        let state = STATE_IDLE_CENTER;
        let tick = 0;
        let frameIndex = 0;

        img.src = kevinSrc(1);
        wrapper.style.left = baseLeft + "px";

        function setFrameFrom(list) {
            img.src = kevinSrc(list[frameIndex % list.length]);
        }

        function stepWalk(list, direction) {
            setFrameFrom(list);
            frameIndex = (frameIndex + 1) % list.length;

            offset += STEP_PX * direction;
            if (offset > MAX_OFFSET) offset = MAX_OFFSET;
            if (offset < -MAX_OFFSET) offset = -MAX_OFFSET;

            wrapper.style.left = baseLeft + offset + "px";
        }

        setInterval(() => {
            tick++;

            switch (state) {
                case STATE_IDLE_CENTER:
                    setFrameFrom(FRAMES_IDLE_CENTER);
                    if (tick % 2 === 0) {
                        frameIndex = (frameIndex + 1) % FRAMES_IDLE_CENTER.length;
                    }
                    wrapper.style.left = baseLeft + "px";
                    offset = 0;

                    if (tick >= 10) {
                        tick = 0;
                        frameIndex = 0;
                        state = STATE_WALK_RIGHT;
                    }
                    break;

                case STATE_WALK_RIGHT:
                    stepWalk(FRAMES_WALK_RIGHT, 1);
                    if (tick >= 9) {
                        tick = 0;
                        frameIndex = 0;
                        state = STATE_IDLE_RIGHT;
                    }
                    break;

                case STATE_IDLE_RIGHT:
                    setFrameFrom(FRAMES_IDLE_RIGHT);
                    if (tick % 2 === 0) {
                        frameIndex = (frameIndex + 1) % FRAMES_IDLE_RIGHT.length;
                    }
                    if (tick >= 10) {
                        tick = 0;
                        frameIndex = 0;
                        state = STATE_WALK_LEFT;
                    }
                    break;

                case STATE_WALK_LEFT:
                    stepWalk(FRAMES_WALK_LEFT, -1);
                    if (tick >= 9) {
                        tick = 0;
                        frameIndex = 0;
                        state = STATE_IDLE_CENTER;
                    }
                    break;
            }
        }, SPEED);
    }

    // ---------- SLOT AUTO (BUTTON / LEVER -> SPIN -> STOP) ----------
    function initSlotAuto() {
        const btn = document.getElementById("btnRoll");
        const lever = document.getElementById("lever");

        const slotUI = document.querySelector(".slot-ui");
        const reels = Array.from(document.querySelectorAll(".reel"));
        const faces = [
            document.getElementById("slot1"),
            document.getElementById("slot2"),
            document.getElementById("slot3"),
        ];
        const winFx = document.getElementById("winFx");

        // --- SFX (preload) ---
        // Put your files here:
        // ./audio/hold/lever.mp3  (sound when pulling lever / spin)
        // ./audio/hold/win.mp3    (sound on jackpot)
        const sfxLever = new Audio("./audio/hold/lever.mp3");
        const sfxWin = new Audio("./audio/hold/win.mp3");
        sfxLever.preload = "auto";
        sfxWin.preload = "auto";

        function playSound(a) {
            try {
                a.currentTime = 0;
                a.play();
            } catch (e) { /* ignore autoplay restrictions */ }
        }


        if (!slotUI || reels.length !== 3 || faces.some(x => !x)) return;

        let spinning = false;
        let timers = [];
        let intervals = [];
        let winTimer = null;

        function clearAllTimers() {
            timers.forEach(t => clearTimeout(t));
            timers = [];
            intervals.forEach(i => clearInterval(i));
            intervals = [];
            if (winTimer) clearTimeout(winTimer);
            winTimer = null;
        }

        function setFinal(i, isHryvnia) {
            faces[i].textContent = "₴";
            if (isHryvnia) reels[i].classList.remove("is-empty");
            else reels[i].classList.add("is-empty");
        }

        const spinPool = ["₴", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

        function startSpinVisual(i) {
            reels[i].classList.add("is-spinning");
            reels[i].classList.remove("is-empty");
            intervals[i] = setInterval(() => {
                const pick = spinPool[(Math.random() * spinPool.length) | 0];
                faces[i].textContent = pick;
            }, 60);
        }

        function stopSpinVisual(i, finalIsHryvnia) {
            clearInterval(intervals[i]);
            reels[i].classList.remove("is-spinning");
            setFinal(i, finalIsHryvnia);
        }

        function pickResultMask() {
            const jackpotChance = 0.08; // 8%: 3/3
            if (Math.random() < jackpotChance) return [true, true, true];

            const twoChance = 0.65; // 65% -> 2/3, 35% -> 1/3
            const count = Math.random() < twoChance ? 2 : 1;

            const idxs = [0, 1, 2];
            for (let i = idxs.length - 1; i > 0; i--) {
                const j = (Math.random() * (i + 1)) | 0;
                [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
            }

            const mask = [false, false, false];
            for (let k = 0; k < count; k++) mask[idxs[k]] = true;
            return mask;
        }

        function spawnWinSparks() {
            if (!winFx) return;
            winFx.innerHTML = "";

            const count = 22;
            for (let i = 0; i < count; i++) {
                const s = document.createElement("span");
                s.className = "spark";

                const x = 20 + Math.random() * 60;
                const y = 25 + Math.random() * 35;

                const dx = (-60 + Math.random() * 120);
                const dy = (-70 + Math.random() * 110);

                s.style.setProperty("--x", x.toFixed(2));
                s.style.setProperty("--y", y.toFixed(2));
                s.style.setProperty("--dx", dx.toFixed(0));
                s.style.setProperty("--dy", dy.toFixed(0));
                s.style.animationDelay = (Math.random() * 120).toFixed(0) + "ms";

                winFx.appendChild(s);
            }
        }

        function playWin() {
            playSound(sfxWin);
            if (navigator.vibrate) navigator.vibrate(500);
            slotUI.classList.add("is-win");
            spawnWinSparks();
            winTimer = setTimeout(() => {
                slotUI.classList.remove("is-win");
                if (winFx) winFx.innerHTML = "";
            }, 950);
        }

        function setControlsEnabled(enabled) {
            if (btn) btn.disabled = !enabled;
            if (lever) {
                if (enabled) lever.classList.remove("is-disabled");
                else lever.classList.add("is-disabled");
            }
        }

        function pulseLever() {
            if (!lever) return;

            // Try Web Animations API to avoid CSS specificity conflicts
            try {
                const base = getComputedStyle(lever).transform;
                const baseT = (base && base !== "none") ? base : "";
                lever.animate([
                    { transform: baseT },
                    { transform: `${baseT} translateY(${getComputedStyle(document.documentElement).getPropertyValue("--leverPullY") || "10px"}) rotate(${getComputedStyle(document.documentElement).getPropertyValue("--leverPullRot") || "6deg"})` },
                    { transform: baseT }
                ], { duration: 520, easing: "cubic-bezier(.2,.9,.2,1)" });
            } catch (e) {
                // ignore
            }

            // Fallback (if you have CSS .lever.is-pulled)
            lever.classList.remove("is-pulled");
            void lever.offsetWidth;
            lever.classList.add("is-pulled");
            setTimeout(() => lever.classList.remove("is-pulled"), 520);
        }

        function spin() {
            if (spinning) return;
            spinning = true;

            slotUI.classList.remove("is-win");
            if (winFx) winFx.innerHTML = "";

            clearAllTimers();
            pulseLever();

            setControlsEnabled(false);
            playSound(sfxLever);

            const result = pickResultMask();

            for (let i = 0; i < 3; i++) startSpinVisual(i);

            const base = 900;
            const step = 260;

            for (let i = 0; i < 3; i++) {
                timers[i] = setTimeout(() => {
                    stopSpinVisual(i, result[i]);

                    if (i === 2) {
                        if (result[0] && result[1] && result[2]) playWin();
                        spinning = false;
                        setControlsEnabled(true);
                    }
                }, base + step * i + ((Math.random() * 120) | 0));
            }
        }

        // initial static state
        (function initStatic() {
            let mask = pickResultMask();
            if (mask[0] && mask[1] && mask[2]) mask = pickResultMask();
            setFinal(0, mask[0]);
            setFinal(1, mask[1]);
            setFinal(2, mask[2]);
        })();

        if (btn) btn.addEventListener("click", spin);
        if (lever) lever.addEventListener("click", spin);
    }

    // ---------- Init ----------
    startTypewriter();
    animateLoop(document.getElementById("marvSprite"), "marv", "marv_scene6", 6, 160);
    animateLoop(document.getElementById("harrySprite"), "harry", "harry_idle", 6, 160);
    setupKevinWalkProper("#kevinWrap");
    initSlotAuto();
})(); // ✅ fixed: close IIFE properly

;
(() => { // ✅ fixed: safe new IIFE
    const TARGET = ["1", "7", "7", "8", "X", "X", "X"]; // итог
    const DIGITS_COUNT = TARGET.length;

    const elKevin = document.getElementById("digitsKevin");
    const elBandits = document.getElementById("digitsBandits");

    // Найдём сами панели по уже существующим классам
    const panelKevin = document.querySelector(".panel--kevin");
    const panelBandits = document.querySelector(".panel--bandits");

    function buildDigits(container) {
        if (!container) return;
        container.innerHTML = "";
        for (let i = 0; i < DIGITS_COUNT; i++) {
            const cell = document.createElement("span");
            cell.className = "digit";
            cell.innerHTML = `<span class="digit__face">X</span>`;
            container.appendChild(cell);
        }
    }

    function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    async function rollPanel(panelEl, digitsEl) {
        if (!panelEl || !digitsEl) return;
        if (panelEl.dataset.busy === "1") return;

        panelEl.dataset.busy = "1";

        // press feedback
        panelEl.classList.add("is-pressed");
        await sleep(90);
        panelEl.classList.remove("is-pressed");

        panelEl.classList.add("is-rolling");

        const cells = Array.from(digitsEl.querySelectorAll(".digit"));
        const faces = cells.map((c) => c.querySelector(".digit__face"));

        // старт: все X
        faces.forEach((f) => (f.textContent = "X"));

        // слева направо, по одной цифре
        for (let i = 0; i < DIGITS_COUNT; i++) {
            const cell = cells[i];
            const face = faces[i];

            // запустили "спин" именно на этой ячейке
            cell.classList.add("is-spinning");

            // quick random flicker while spinning (slot vibe)
            const pool = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "X"];
            const spinInterval = setInterval(() => {
                face.textContent = pool[(Math.random() * pool.length) | 0];
            }, 55);


            // имитация прокрутки (чуть разная длительность, чтобы живее)
            const spinTime = 360 + i * 90; // можешь крутить
            await sleep(spinTime);

            // остановка + установка нужного символа
            clearInterval(spinInterval);
            cell.classList.remove("is-spinning");
            face.textContent = TARGET[i];

            // маленькая пауза между ячейками (визуально "как слот")
            await sleep(70);
        }

        // подсветка чуть держится и гаснет
        await sleep(260);
        panelEl.classList.remove("is-rolling");

        panelEl.dataset.busy = "0";
    }

    // init
    buildDigits(elKevin);
    buildDigits(elBandits);

    // click handlers (клик по всей панели) — ✅ fixed optional chaining
    if (panelKevin) panelKevin.addEventListener("click", () => rollPanel(panelKevin, elKevin));
    if (panelBandits) panelBandits.addEventListener("click", () => rollPanel(panelBandits, elBandits));
})();