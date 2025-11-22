// MBHA main JS – коды, гости, музыка, правила
(function() {
    // =================== MBHA: USERS FROM GOOGLE SHEETS ===================

    const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRWO7yjYAibcHlzSacrVRoI59NWF3R0BvK4In7Hb2Gf6vD8Raco_QOdGUJiS7ckRARsCbc3Rz5wUHUu/pub?gid=0&single=true&output=csv";
    const GUEST_AVATAR = "img/avatars/GUEST.png";

    // Кэш таблицы
    let usersDbCache = null;

    function getUrlParams() {
        return new URLSearchParams(window.location.search);
    }

    function getCodeFromUrl() {
        const params = getUrlParams();
        const code = params.get("code");
        return code ? code.trim().toUpperCase() : null;
    }

    function isGuestFromUrl() {
        const params = getUrlParams();
        return params.get("guest") === "1";
    }

    // Парсер CSV
    function parseCsv(text) {
        const lines = text.trim().split(/\r?\n/);
        if (!lines.length) return [];

        const headers = lines[0].split(",").map(h => h.trim());
        const rows = lines.slice(1).filter(line => line.trim().length > 0);

        return rows.map(line => {
            const cells = line.split(",");
            const obj = {};
            headers.forEach((h, i) => {
                obj[h] = (cells[i] || "").trim();
            });
            return obj;
        });
    }

    // Загружаем всех юзеров из Google Sheets
    async function loadUsersFromSheet() {
        if (usersDbCache) return usersDbCache;

        const res = await fetch(SHEET_URL);
        if (!res.ok) {
            throw new Error("Failed to fetch sheet: " + res.status);
        }
        const text = await res.text();
        const rows = parseCsv(text);

        const dbByCode = {};
        rows.forEach(row => {
            const rawCode = row["CODE"] || "";
            const code = rawCode.trim().toUpperCase();
            if (code) {
                dbByCode[code] = row;
            }
        });

        usersDbCache = dbByCode;
        return usersDbCache;
    }

    function makeGuestProfile(code) {
        return {
            PLAYER: "GUEST",
            CODE: code || "",
            "PERSONAL ACCOUNT": "-----",
            TEAM: "",
            "TEAM KEVIN": "0",
            "TEAM OF BANDITS": "0",
            TOTAL: "0"
        };
    }

    function normalizeProfile(row) {
        return {
            name: row["PLAYER"] || "GUEST",
            code: (row["CODE"] || "").trim().toUpperCase(),
            personalAccount: row["PERSONAL ACCOUNT"] || "-----",
            total: row["TOTAL"] || "0",
            teamKevin: row["TEAM KEVIN"] || "0",
            teamBandits: row["TEAM OF BANDITS"] || "0"
        };
    }

    function getAvatarSrc(profile) {
        if (!profile || !profile.code) {
            return GUEST_AVATAR;
        }
        return `img/avatars/${profile.code}.png`;
    }

    function renderProfile(profile) {
        const usernameEl = document.querySelector(".username");
        const personalEl = document.getElementById("personal_value");
        const totalEl = document.getElementById("total_value");
        const kevinEl = document.getElementById("kevin_value");
        const banditsEl = document.getElementById("bandits_value");
        const photoEl = document.querySelector(".user-photo img");

        if (usernameEl) usernameEl.textContent = profile.name;
        if (personalEl) personalEl.textContent = profile.personalAccount;
        if (totalEl) totalEl.textContent = profile.total;
        if (kevinEl) kevinEl.textContent = profile.teamKevin;
        if (banditsEl) banditsEl.textContent = profile.teamBandits;

        if (photoEl) {
            const src = getAvatarSrc(profile);

            // fallback на гостя, если файла нет
            photoEl.onerror = function() {
                if (!photoEl.src.includes(GUEST_AVATAR)) {
                    photoEl.src = GUEST_AVATAR;
                }
            };

            photoEl.src = src;
        }
    }

    // Загружаем и рендерим профиль
    async function initUserProfile() {
        const code = getCodeFromUrl();
        const guestMode = isGuestFromUrl();

        let row;
        try {
            const usersDb = await loadUsersFromSheet();

            if (!guestMode && code && usersDb[code]) {
                row = usersDb[code];
            } else if (!guestMode && code && !usersDb[code]) {
                row = makeGuestProfile(code);
            } else {
                row = makeGuestProfile(null);
            }
        } catch (err) {
            console.error("Ошибка работы с таблицей:", err);
            row = makeGuestProfile(code);
        }

        const profile = normalizeProfile(row);
        renderProfile(profile);
    }

    // =================== DONT PUSH BUTTON (user/guest) ===================

    const dontPushUserSound = new Audio("audio/dont-push-user.mp3");
    const dontPushGuestSound = new Audio("audio/dont-push-guest.mp3");

    dontPushUserSound.loop = false;
    dontPushGuestSound.loop = false;

    // по умолчанию — гость
    let mbhaRole = "guest";

    function setMbhaRole(role) {
        mbhaRole = (role === "user") ? "user" : "guest";
    }

    document.addEventListener("DOMContentLoaded", () => {
        const dontPushBtn = document.getElementById("dont-push-btn");
        if (!dontPushBtn) return;

        dontPushBtn.addEventListener("click", () => {
            // сброс звуков
            dontPushUserSound.pause();
            dontPushGuestSound.pause();
            dontPushUserSound.currentTime = 0;
            dontPushGuestSound.currentTime = 0;

            const snd = (mbhaRole === "user") ?
                dontPushUserSound :
                dontPushGuestSound;

            snd.play().catch(() => {});
        });
    });

    // =================== ВХОД ПО КОДУ ===================

    function showCodeModal() {
        const modal = document.getElementById("codeModal");
        if (!modal) return;
        modal.classList.add("code-modal--visible");

        const input = document.getElementById("codeInput");
        if (input) {
            input.value = "";
            setTimeout(() => input.focus(), 50);
        }
    }

    function hideCodeModal() {
        const modal = document.getElementById("codeModal");
        if (!modal) return;
        modal.classList.remove("code-modal--visible");
    }

    function updateUrlParams(params) {
        const qs = params.toString();
        const newUrl = window.location.pathname + (qs ? "?" + qs : "");
        window.history.replaceState(null, "", newUrl);
    }

    function initCodeFlow() {
        const codeModal = document.getElementById("codeModal");
        const codeInput = document.getElementById("codeInput");
        const codeSubmitBtn = document.getElementById("codeSubmitBtn");
        const codeGuestBtn = document.getElementById("codeGuestBtn");
        const codeError = document.getElementById("codeError");

        // ВСЕГДА показываем модалку при заходе
        if (codeModal) {
            showCodeModal();
        }

        // Если вдруг модалки нет — просто грузим профиль и выставляем роль
        if (!codeInput || !codeSubmitBtn || !codeGuestBtn) {
            const code = getCodeFromUrl();
            const guestMode = isGuestFromUrl();

            if (guestMode || !code) {
                setMbhaRole("guest");
            } else {
                setMbhaRole("user");
            }

            initUserProfile();
            return;
        }

        function showError(msg) {
            if (codeError) {
                codeError.textContent = msg || "";
            }
        }

        // Подтверждение кода
        codeSubmitBtn.addEventListener("click", async() => {
            const raw = codeInput.value.trim().toUpperCase();

            if (raw.length !== 4) {
                showError("НУ ДАЙ ТРОХИ ЛІТЕР");
                return;
            }

            try {
                const usersDb = await loadUsersFromSheet();
                if (!usersDb[raw]) {
                    showError("Такого кода нет. Проверь ещё раз.");
                    return;
                }

                const params = getUrlParams();
                params.set("code", raw);
                params.delete("guest");
                updateUrlParams(params);

                setMbhaRole("user");

                hideCodeModal();
                initUserProfile();
            } catch (err) {
                console.error("Ошибка проверки кода:", err);
                showError("Міша, все ***, давай по новой");
            }
        });

        // Вход как гость
        codeGuestBtn.addEventListener("click", () => {
            const params = getUrlParams();
            params.delete("code");
            params.set("guest", "1");
            updateUrlParams(params);

            setMbhaRole("guest");

            hideCodeModal();
            initUserProfile();
        });

        // Enter по инпуту
        codeInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                codeSubmitBtn.click();
            }
        });
    }

    // Запускаем логин/профиль
    initCodeFlow();

    // =================== RULES ===================
    const rulesBtn = document.getElementById("rulesBtn");
    const rulesModal = document.getElementById("rulesModal");
    const rulesBackdrop = document.getElementById("rulesBackdrop");
    const rulesCloseBtn = document.getElementById("rulesCloseBtn");

    function openRules() {
        if (!rulesModal) return;
        rulesModal.classList.add("rules-modal--visible");
        document.body.style.overflow = "hidden";
    }

    function closeRules() {
        if (!rulesModal) return;
        rulesModal.classList.remove("rules-modal--visible");
        document.body.style.overflow = "";
    }

    if (rulesBtn && rulesModal && rulesBackdrop && rulesCloseBtn) {
        rulesBtn.addEventListener("click", openRules);
        rulesCloseBtn.addEventListener("click", closeRules);
        rulesBackdrop.addEventListener("click", closeRules);

        document.addEventListener("keydown", function(e) {
            if (e.key === "Escape") {
                closeRules();
            }
        });
    }

    // =================== MUSIC ===================
    const musicBtn = document.getElementById("musicBtn");
    const musicUrl = "audio/song1.mp3";

    let audio = null;
    let isPlaying = false;

    if (musicBtn) {
        audio = new Audio(musicUrl);
        audio.loop = true;

        function updateVisual() {
            if (!musicBtn) return;
            if (isPlaying) {
                musicBtn.classList.add("is-playing");
            } else {
                musicBtn.classList.remove("is-playing");
            }
        }

        function playMusic() {
            if (!audio) return;
            audio.play()
                .then(() => {
                    isPlaying = true;
                    updateVisual();
                })
                .catch((err) => {
                    console.error("Cannot play audio:", err);
                });
        }

        function pauseMusic() {
            if (!audio) return;
            audio.pause();
            isPlaying = false;
            updateVisual();
        }

        musicBtn.addEventListener("click", function() {
            if (!audio) return;
            if (isPlaying) {
                pauseMusic();
            } else {
                playMusic();
            }
        });

        audio.addEventListener("ended", function() {
            isPlaying = false;
            updateVisual();
        });
    }
    // ======================================================================
    // MBHA · ARCADE GAME (добавка в конец main.js) + SOUNDS
    // ======================================================================
    (function() {
        const arcadeModal = document.getElementById('arcadeModal');
        const arcadeBackdrop = document.getElementById('arcadeBackdrop');
        const arcadeBtn = document.getElementById('arcadeBtn');
        const arcadeCloseBtn = document.getElementById('arcadeCloseBtn');

        const arcadeScoreEl = document.getElementById('arcadeScore');
        const arcadeLivesEl = document.getElementById('arcadeLives');
        const arcadeWaveEl = document.getElementById('arcadeWave');
        const arcadeFinalScoreEl = document.getElementById('arcadeFinalScore');

        const arcadeRestartBtn = document.getElementById('arcadeRestartBtn');
        const arcadeMuteBtn = document.getElementById('arcadeMuteBtn');
        const arcadeGameOverRestartBtn = document.getElementById('arcadeGameOverRestartBtn');

        const arcadeStartScreen = document.getElementById('arcadeStartScreen');
        const arcadeGameOverScreen = document.getElementById('arcadeGameOverScreen');

        const canvas = document.getElementById('arcadeCanvas');
        if (!canvas || !arcadeModal) {
            // На всякий случай, если HTML ещё не обновили — выходим тихо
            return;
        }

        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        let arcadeInitialized = false;
        let isArcadeVisible = false;

        // ----- Игровое состояние -----
        const KEYS = {
            left: false,
            right: false
        };

        const GAME_STATE = {
            running: false,
            gameOver: false,
            wave: 1,
            score: 0,
            lives: 3,
            lastSpawnTime: 0,
            spawnInterval: 900, // мс между спавном объектов
            objects: [],
            bullets: [],
            lastFrameTime: 0
        };

        const PLAYER = {
            x: W / 2 - 12,
            y: H - 26,
            w: 24,
            h: 12,
            speed: 140 // px/sec
        };

        let mute = false;
        let rafId = null;

        // ======================================================================
        // ЗВУКИ
        // ======================================================================

        const sndShoot = new Audio('audio/shoot.mp3');
        const sndGift = new Audio('audio/gift.mp3');
        const sndTrap = new Audio('audio/trap.mp3');
        const sndGameOver = new Audio('audio/game_over.mp3');
        const sndWave = new Audio('audio/wave.mp3');

        // Чтобы звуки могли играть параллельно, клонируем ноду
        function playSound(baseAudio, volume = 0.9) {
            if (mute || !baseAudio) return;
            try {
                const a = baseAudio.cloneNode();
                a.volume = volume;
                a.play().catch(() => {});
            } catch (e) {
                // тихо игнорируем
            }
        }

        // ======================================================================
        // ВСПОМОГАТЕЛЬНЫЕ
        // ======================================================================

        function clamp(val, min, max) {
            return Math.max(min, Math.min(max, val));
        }

        function resetGameState() {
            GAME_STATE.running = false;
            GAME_STATE.gameOver = false;
            GAME_STATE.wave = 1;
            GAME_STATE.score = 0;
            GAME_STATE.lives = 3;
            GAME_STATE.lastSpawnTime = 0;
            GAME_STATE.spawnInterval = 900;
            GAME_STATE.objects = [];
            GAME_STATE.bullets = [];
            GAME_STATE.lastFrameTime = performance.now();

            updateHUD();
            showStartScreen();
            hideGameOverScreen();
            clearCanvas();
            drawStaticScene();
        }

        function updateHUD() {
            if (arcadeScoreEl) arcadeScoreEl.textContent = GAME_STATE.score.toString().padStart(4, '0');
            if (arcadeLivesEl) arcadeLivesEl.textContent = GAME_STATE.lives.toString();
            if (arcadeWaveEl) arcadeWaveEl.textContent = GAME_STATE.wave.toString();
        }

        function clearCanvas() {
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, W, H);
        }

        function drawStaticScene() {
            // Фоновая "улица" в стиле SNES
            // Небо
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, W, H);

            // "Снег" внизу
            ctx.fillStyle = '#e5e7eb';
            ctx.fillRect(0, H - 18, W, 18);

            // Простой дом/силуэт
            ctx.fillStyle = '#111827';
            ctx.fillRect(20, 80, 80, 60);
            ctx.fillRect(W - 100, 70, 80, 70);

            // Окна-жёлтые квадраты
            ctx.fillStyle = '#facc15';
            ctx.fillRect(30, 90, 10, 10);
            ctx.fillRect(60, 90, 10, 10);
            ctx.fillRect(W - 80, 80, 10, 10);
            ctx.fillRect(W - 50, 100, 10, 10);

            // Ель слева
            ctx.fillStyle = '#065f46';
            ctx.fillRect(135, 90, 30, 10);
            ctx.fillRect(140, 80, 20, 10);
            ctx.fillRect(145, 70, 10, 10);
            ctx.fillStyle = '#92400e';
            ctx.fillRect(146, 100, 8, 10);
        }

        function showStartScreen() {
            if (arcadeStartScreen) arcadeStartScreen.style.display = 'flex';
        }

        function hideStartScreen() {
            if (arcadeStartScreen) arcadeStartScreen.style.display = 'none';
        }

        function showGameOverScreen() {
            if (arcadeGameOverScreen) arcadeGameOverScreen.style.display = 'flex';
            if (arcadeFinalScoreEl) {
                arcadeFinalScoreEl.textContent = GAME_STATE.score.toString().padStart(4, '0');
            }
        }

        function hideGameOverScreen() {
            if (arcadeGameOverScreen) arcadeGameOverScreen.style.display = 'none';
        }

        // ======================================================================
        // ОБЪЕКТЫ: ПОДАРКИ / ЛОВУШКИ
        // ======================================================================

        function spawnObject(now) {
            // случайно: подарок (good) или ловушка (bad)
            const isGift = Math.random() < 0.6; // 60% подарки
            const size = isGift ? 10 : 12;
            const speed = isGift ? 50 + GAME_STATE.wave * 5 : 70 + GAME_STATE.wave * 8;

            GAME_STATE.objects.push({
                x: Math.random() * (W - size),
                y: -size,
                w: size,
                h: size,
                speed: speed,
                type: isGift ? 'gift' : 'trap'
            });

            GAME_STATE.lastSpawnTime = now;
        }

        function spawnBullet() {
            // лимит на кол-во пуль
            if (GAME_STATE.bullets.length > 4) return;

            GAME_STATE.bullets.push({
                x: PLAYER.x + PLAYER.w / 2 - 1,
                y: PLAYER.y - 4,
                w: 2,
                h: 6,
                speed: 220
            });

            playSound(sndShoot, 0.8);
        }

        function rectsCollide(a, b) {
            return !(
                a.x + a.w < b.x ||
                a.x > b.x + b.w ||
                a.y + a.h < b.y ||
                a.y > b.y + b.h
            );
        }

        // ======================================================================
        // РЕНДЕР
        // ======================================================================

        function drawPlayer() {
            // Тело
            ctx.fillStyle = '#f97316';
            ctx.fillRect(PLAYER.x, PLAYER.y, PLAYER.w, PLAYER.h);

            // "Голова"
            ctx.fillStyle = '#facc15';
            ctx.fillRect(PLAYER.x + PLAYER.w / 2 - 4, PLAYER.y - 6, 8, 6);

            // Ножки
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(PLAYER.x + 3, PLAYER.y + PLAYER.h, 4, 3);
            ctx.fillRect(PLAYER.x + PLAYER.w - 7, PLAYER.y + PLAYER.h, 4, 3);
        }

        function drawObjects() {
            GAME_STATE.objects.forEach(obj => {
                if (obj.type === 'gift') {
                    // коробка-подарок
                    ctx.fillStyle = '#22c55e';
                    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
                    ctx.fillStyle = '#facc15';
                    ctx.fillRect(obj.x + obj.w / 2 - 1, obj.y, 2, obj.h);
                    ctx.fillRect(obj.x, obj.y + obj.h / 2 - 1, obj.w, 2);
                } else {
                    // "ловушка" — шипы
                    ctx.fillStyle = '#ef4444';
                    ctx.fillRect(obj.x, obj.y + obj.h / 2, obj.w, obj.h / 2);
                    ctx.fillStyle = '#e5e7eb';
                    ctx.fillRect(obj.x, obj.y + obj.h / 2 - 2, obj.w, 2);
                }
            });
        }

        function drawBullets() {
            ctx.fillStyle = '#e5e7eb';
            GAME_STATE.bullets.forEach(b => {
                ctx.fillRect(b.x, b.y, b.w, b.h);
            });
        }

        // ======================================================================
        // ЛОГИКА ИГРЫ
        // ======================================================================

        function updateGame(delta, now) {
            if (!GAME_STATE.running || GAME_STATE.gameOver) return;

            const dt = delta / 1000;

            // Движение игрока
            if (KEYS.left) {
                PLAYER.x -= PLAYER.speed * dt;
            }
            if (KEYS.right) {
                PLAYER.x += PLAYER.speed * dt;
            }
            PLAYER.x = clamp(PLAYER.x, 0, W - PLAYER.w);

            // Спавн объектов
            if (now - GAME_STATE.lastSpawnTime > GAME_STATE.spawnInterval) {
                spawnObject(now);
            }

            // Обновление объектов
            GAME_STATE.objects.forEach(obj => {
                obj.y += obj.speed * dt;
            });

            // Удаление вышедших за экран
            GAME_STATE.objects = GAME_STATE.objects.filter(obj => obj.y < H + 20);

            // Обновление пуль
            GAME_STATE.bullets.forEach(b => {
                b.y -= b.speed * dt;
            });
            GAME_STATE.bullets = GAME_STATE.bullets.filter(b => b.y > -10);

            // Коллизии: пули vs объекты
            for (let i = GAME_STATE.bullets.length - 1; i >= 0; i--) {
                const b = GAME_STATE.bullets[i];
                for (let j = GAME_STATE.objects.length - 1; j >= 0; j--) {
                    const o = GAME_STATE.objects[j];
                    if (rectsCollide(b, o)) {
                        // Пуля уничтожает объект
                        if (o.type === 'gift') {
                            GAME_STATE.score += 15;
                            playSound(sndGift, 0.9);
                        } else {
                            GAME_STATE.score += 5;
                            playSound(sndTrap, 0.7);
                        }
                        GAME_STATE.bullets.splice(i, 1);
                        GAME_STATE.objects.splice(j, 1);
                        updateHUD();
                        break;
                    }
                }
            }

            // Коллизии: игрок vs объекты (ловим подарки, избегаем ловушек)
            for (let i = GAME_STATE.objects.length - 1; i >= 0; i--) {
                const o = GAME_STATE.objects[i];
                if (rectsCollide(PLAYER, o)) {
                    if (o.type === 'gift') {
                        GAME_STATE.score += 10;
                        playSound(sndGift, 0.9);
                    } else {
                        GAME_STATE.lives -= 1;
                        playSound(sndTrap, 0.8);
                        if (GAME_STATE.lives <= 0) {
                            GAME_STATE.lives = 0;
                            updateHUD();
                            endGame();
                            return;
                        }
                    }
                    GAME_STATE.objects.splice(i, 1);
                    updateHUD();
                }
            }

            // Повышение волны по очкам
            const newWave = 1 + Math.floor(GAME_STATE.score / 80);
            if (newWave !== GAME_STATE.wave) {
                GAME_STATE.wave = newWave;
                GAME_STATE.spawnInterval = Math.max(350, 900 - GAME_STATE.wave * 40);
                updateHUD();
                playSound(sndWave, 0.6);
            }
        }

        function renderGame() {
            clearCanvas();
            drawStaticScene();
            drawObjects();
            drawBullets();
            drawPlayer();
        }

        function gameLoop(timestamp) {
            if (!isArcadeVisible) {
                // если модалка закрыта — не рисуем
                return;
            }

            const delta = timestamp - GAME_STATE.lastFrameTime;
            GAME_STATE.lastFrameTime = timestamp;

            updateGame(delta, timestamp);
            renderGame();

            rafId = requestAnimationFrame(gameLoop);
        }

        function startGame() {
            if (GAME_STATE.gameOver) {
                resetGameState();
            }
            hideStartScreen();
            hideGameOverScreen();
            GAME_STATE.running = true;
            GAME_STATE.lastFrameTime = performance.now();
        }

        function endGame() {
            GAME_STATE.running = false;
            GAME_STATE.gameOver = true;
            updateHUD();
            showGameOverScreen();
            playSound(sndGameOver, 0.9);
        }

        // ======================================================================
        // ОТКРЫТИЕ / ЗАКРЫТИЕ МОДАЛКИ ARCADE
        // ======================================================================

        function openArcadeModal() {
            if (!arcadeModal) return;
            arcadeModal.classList.add('is-open');
            isArcadeVisible = true;

            if (!arcadeInitialized) {
                arcadeInitialized = true;
                resetGameState();
            } else {
                // при повторном открытии перерисуем статику
                clearCanvas();
                drawStaticScene();
                if (GAME_STATE.gameOver) {
                    showGameOverScreen();
                } else {
                    showStartScreen();
                }
            }

            // запускаем цикл отрисовки
            if (!rafId) {
                GAME_STATE.lastFrameTime = performance.now();
                rafId = requestAnimationFrame(gameLoop);
            }
        }

        function closeArcadeModal() {
            if (!arcadeModal) return;
            arcadeModal.classList.remove('is-open');
            isArcadeVisible = false;
            GAME_STATE.running = false; // пауза
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }

        // ======================================================================
        // СОБЫТИЯ
        // ======================================================================

        // Кнопки открытия / закрытия
        if (arcadeBtn) {
            arcadeBtn.addEventListener('click', function() {
                openArcadeModal();
            });
        }

        if (arcadeCloseBtn) {
            arcadeCloseBtn.addEventListener('click', function() {
                closeArcadeModal();
            });
        }

        if (arcadeBackdrop) {
            arcadeBackdrop.addEventListener('click', function() {
                closeArcadeModal();
            });
        }

        // Restart / Play again
        if (arcadeRestartBtn) {
            arcadeRestartBtn.addEventListener('click', function() {
                resetGameState();
            });
        }

        if (arcadeGameOverRestartBtn) {
            arcadeGameOverRestartBtn.addEventListener('click', function() {
                resetGameState();
                startGame();
            });
        }

        // Mute — включение/выключение всех звуков
        if (arcadeMuteBtn) {
            arcadeMuteBtn.addEventListener('click', function() {
                mute = !mute;
                arcadeMuteBtn.textContent = mute ? 'UNMUTE' : 'MUTE';
            });
        }

        // Esc закрывает модалку
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' || e.key === 'Esc') {
                if (isArcadeVisible) {
                    e.preventDefault();
                    closeArcadeModal();
                }
            }
        });

        // Управление стрелками / A D / SPACE
        function isTypingTarget(target) {
            if (!target) return false;
            const tag = target.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
        }

        document.addEventListener('keydown', function(e) {
            if (!isArcadeVisible) return;
            if (isTypingTarget(e.target)) return;

            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                KEYS.left = true;
                e.preventDefault();
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                KEYS.right = true;
                e.preventDefault();
            }
            if (e.code === 'Space') {
                e.preventDefault();
                if (!GAME_STATE.running && !GAME_STATE.gameOver) {
                    // старт с екрана READY?
                    startGame();
                } else if (GAME_STATE.running) {
                    spawnBullet();
                } else if (GAME_STATE.gameOver) {
                    // рестарт пробелом
                    resetGameState();
                    startGame();
                }
            }
        });

        document.addEventListener('keyup', function(e) {
            if (!isArcadeVisible) return;
            if (isTypingTarget(e.target)) return;

            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                KEYS.left = false;
                e.preventDefault();
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                KEYS.right = false;
                e.preventDefault();
            }
        });

    })();

})();