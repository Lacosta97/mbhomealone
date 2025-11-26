// MBHA main JS – коды, гости, музыка, правила
(function() {
    // =================== MBHA: USERS FROM GOOGLE SHEETS ===================

    const SHEET_URL =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vRWO7yjYAibcHlzSacrVRoI59NWF3R0BvK4In7Hb2Gf6vD8Raco_QOdGUJiS7ckRARsCbc3Rz5wUHUu/pub?gid=0&single=true&output=csv";
    const GUEST_AVATAR = "img/avatars/GUEST.png";

    // ===== FIREBASE: FLAPPY SCORES (ТОП-3 + ЛИЧНЫЙ РЕКОРД) =====
    const firebaseConfig = {
        apiKey: "AIzaSyCLbWp6Fl2covgchvupY5H7leUCmlXFAwE",
        authDomain: "mbha-flappy.firebaseapp.com",
        projectId: "mbha-flappy",
        storageBucket: "mbha-flappy.firebasestorage.app",
        messagingSenderId: "800643993606",
        appId: "1:800643993606:web:571b10108b0122ed383387"
    };

    let db = null;
    let flappyScoresCollection = null;

    (function initFirebaseForMain() {
        if (!window.firebase) {
            console.warn("MBHA: Firebase SDK не найден на главной. Проверь index.html");
            return;
        }

        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            flappyScoresCollection = db.collection("flappyScores");
            console.log("MBHA: Firebase инициализирован на главной");
        } catch (e) {
            console.error("MBHA: ошибка инициализации Firebase на главной", e);
        }
    })();

    // Кэш таблицы юзеров
    let usersDbCache = null;

    // роль в MBHA: user | guest
    let mbhaRole = "guest";

    function setMbhaRole(role) {
        mbhaRole = role === "user" ? "user" : "guest";
        window.mbhaRole = mbhaRole;
    }

    function getTodayStr() {
        const d = new Date();
        return d.toISOString().slice(0, 10); // "2025-11-25"
    }

    function loadAuthFromStorage() {
        try {
            const raw = localStorage.getItem("mbhaAuth");
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    // теперь сохраняем и name тоже + lastLogin (для "раз в день")
    function saveAuthToStorage(role, code, name) {
        try {
            const data = {
                role: role === "user" ? "user" : "guest",
                code: code ? String(code).trim().toUpperCase() : null,
                name: name ? String(name) : null,
                lastLogin: getTodayStr()
            };
            localStorage.setItem("mbhaAuth", JSON.stringify(data));
        } catch (e) {
            // тихо игнорим
        }
    }

    function clearAuthStorage() {
        try {
            localStorage.removeItem("mbhaAuth");
        } catch (e) {
            // ок
        }
    }

    function getUrlParams() {
        return new URLSearchParams(window.location.search);
    }

    function getCodeFromUrl() {
        const params = getUrlParams();
        let code = params.get("code");

        if (!code) {
            const saved = loadAuthFromStorage();
            if (saved && saved.role === "user" && saved.code) {
                code = saved.code;
            }
        }

        return code ? code.trim().toUpperCase() : null;
    }

    function isGuestFromUrl() {
        const params = getUrlParams();
        if (params.get("guest") === "1") return true;

        const saved = loadAuthFromStorage();
        if (saved && saved.role === "guest") return true;

        return false;
    }

    // Парсер CSV
    function parseCsv(text) {
        const lines = text.trim().split(/\r?\n/);
        if (!lines.length) return [];

        const headers = lines[0].split(",").map((h) => h.trim());
        const rows = lines.slice(1).filter((line) => line.trim().length > 0);

        return rows.map((line) => {
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
        rows.forEach((row) => {
            const rawCode = getField(row, "CODE") || "";
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
            TOTAL: "0",
            ABOUT: "",
            MODAL_VER: "0"
        };
    }

    // ===== ХЕЛПЕР ДЛЯ ДОСТУПА К ПОЛЯМ С ЛЮБЫМИ ПРОБЕЛАМИ В ЗАГОЛОВКЕ =====
    function getField(row, logicalName) {
        if (!row) return "";
        const target = logicalName.toUpperCase();
        for (const key in row) {
            if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
            // заменяем любые пробелы / NBSP на обычный, схлопываем
            const norm = key
                .replace(/\u00A0/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .toUpperCase();
            if (norm === target) {
                return row[key];
            }
        }
        return "";
    }

    // аккуратно парсим числа из таблицы (убираем пробелы и т.п.)
    function parseScore(value) {
        if (value == null) return 0;
        const cleaned = String(value)
            .replace(/\s/g, "")
            .replace(/,/g, ".");
        const n = parseFloat(cleaned);
        return Number.isFinite(n) ? n : 0;
    }

    // === ВАЖНО: берём нужные поля ИЗ ШИТСА, включая ABOUT и MODAL_VER ===
    function normalizeProfile(row) {
        const rawPlayer = getField(row, "PLAYER") || "GUEST";
        const rawCode = getField(row, "CODE") || "";
        const rawPersonal = getField(row, "PERSONAL ACCOUNT") || "-----";

        const rawKevin = getField(row, "TEAM KEVIN") || "0";
        const rawBandits = getField(row, "TEAM OF BANDITS") || "0";
        const rawTotal = getField(row, "TOTAL") || "0";

        const rawAbout = getField(row, "ABOUT") || "";
        const rawModalVer = getField(row, "MODAL_VER") || "0";

        return {
            name: rawPlayer,
            code: rawCode.trim().toUpperCase(),
            personalAccount: rawPersonal,
            teamKevin: rawKevin,
            teamBandits: rawBandits,
            total: rawTotal,
            about: rawAbout,
            modalVer: rawModalVer
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
        if (kevinEl) kevinEl.textContent = profile.teamKevin;
        if (banditsEl) banditsEl.textContent = profile.teamBandits;
        if (totalEl) totalEl.textContent = profile.total;

        if (photoEl) {
            const src = getAvatarSrc(profile);
            photoEl.onerror = function() {
                if (!photoEl.src.includes(GUEST_AVATAR)) {
                    photoEl.src = GUEST_AVATAR;
                }
            };
            photoEl.src = src;
        }
    }

    // ===== ФЛАГИ ПОКАЗА ONBOARDING ПО MODAL_VER =====

    function getIntroVersion(profile) {
        const ver = (profile && profile.modalVer != null ? String(profile.modalVer) : "0").trim();
        return ver === "" ? "0" : ver;
    }

    function getIntroStorageKey(profile) {
        if (!profile || !profile.code) return null;
        return "mbha_intro_" + profile.code;
    }

    function shouldShowTeamIntro(profile) {
        if (!profile || !profile.code) return false;
        if (mbhaRole !== "user") return false;

        const ver = getIntroVersion(profile);
        const key = getIntroStorageKey(profile);
        if (!key) return false;

        const stored = localStorage.getItem(key);
        // если в таблице новая версия (или вообще ничего не было) — показываем
        return stored !== ver;
    }

    function markTeamIntroSeen(profile) {
        try {
            const key = getIntroStorageKey(profile);
            if (!key) return;
            const ver = getIntroVersion(profile);
            localStorage.setItem(key, ver);
        } catch (e) {
            // тихо
        }
    }

    // ===== TEAM INTRO MODAL (показ, печатная машинка, звук) =====

    let teamTypeAudio = null;

    function maybeShowTeamIntro(profile) {
        // показываем только если версия ещё не видена
        if (!shouldShowTeamIntro(profile)) return;

        const modal = document.getElementById("teamModal");
        if (!modal) return;

        const aboutEl = document.getElementById("teamAboutText");
        const msgEl = document.getElementById("teamMessage");
        const photoEl = modal.querySelector(".team-modal__photo img");
        const btnKevin = document.getElementById("teamKevinBtn");
        const btnBandits = document.getElementById("teamBanditsBtn");
        const closeBtn = document.getElementById("teamModalClose");

        if (!aboutEl || !msgEl || !photoEl || !btnKevin || !btnBandits) {
            return;
        }

        // Сброс состояния
        msgEl.textContent = "";
        aboutEl.textContent = "";
        btnKevin.disabled = false;
        btnBandits.disabled = false;

        if (closeBtn) {
            closeBtn.classList.remove("team-modal__close--visible");
            closeBtn.onclick = null;
        }

        // Аватар
        const avatarSrc = getAvatarSrc(profile);
        photoEl.onerror = function() {
            if (!photoEl.src.includes(GUEST_AVATAR)) {
                photoEl.src = GUEST_AVATAR;
            }
        };
        photoEl.src = avatarSrc;

        // Текст ABOUT
        const fullText = (profile.about && profile.about.trim()) ?
            profile.about.trim() :
            `Name: ${profile.name || "PLAYER"}`;

        // Готовим аудио печатной машинки
        if (teamTypeAudio) {
            try {
                teamTypeAudio.pause();
            } catch (e) {}
        }
        teamTypeAudio = new Audio("audio/typewriter.mp3");
        teamTypeAudio.loop = false;
        teamTypeAudio.currentTime = 0;

        let idx = 0;
        const speed = 35; // мс на символ

        function typeNext() {
            if (idx === 0) {
                teamTypeAudio.play().catch(() => {});
            }

            if (idx < fullText.length) {
                aboutEl.textContent += fullText.charAt(idx);
                idx++;
                setTimeout(typeNext, speed);
            } else {
                // закончили печатать — стоп звук
                if (teamTypeAudio) {
                    try {
                        teamTypeAudio.pause();
                        teamTypeAudio.currentTime = 0;
                    } catch (e) {}
                }
            }
        }

        typeNext();

        function closeTeamModal() {
            modal.classList.remove("team-modal--visible");
            document.body.style.overflow = "";
            if (teamTypeAudio) {
                try {
                    teamTypeAudio.pause();
                    teamTypeAudio.currentTime = 0;
                } catch (e) {}
            }
        }

        function handleChoice() {
            if (btnKevin.disabled || btnBandits.disabled) return;

            btnKevin.disabled = true;
            btnBandits.disabled = true;

            if (teamTypeAudio) {
                try {
                    teamTypeAudio.pause();
                    teamTypeAudio.currentTime = 0;
                } catch (e) {}
            }

            // помечаем, что текущую версию онбординга юзер уже видел
            markTeamIntroSeen(profile);

            msgEl.textContent =
                "ХАХ! НЕ ВИГАДУЙ ДУРНИЦЬ, СВОЮ КОМАНДУ ДІЗНАЄШСЯ ПРИ ОГОЛОШЕННІ РЕЗУЛЬТАТІВ 🐋💨";

            // ❗БОЛЬШЕ НЕ АВТОЗАКРЫВАЕМ — только крестиком
            if (closeBtn) {
                closeBtn.classList.add("team-modal__close--visible");
                closeBtn.onclick = closeTeamModal;
            }
        }

        // Назначаем обработчики
        btnKevin.onclick = handleChoice;
        btnBandits.onclick = handleChoice;

        // Показываем модал
        modal.classList.add("team-modal--visible");
        document.body.style.overflow = "hidden";
    }


    // ===== FLAPPY CAKE: рендер TOP-3 + личный рекорд (UI остаётся прежним) =====
    function renderFlappyLeaderboard(data) {
        const topEl = document.getElementById("flappyTop3");
        const userScoreEl = document.getElementById("flappyUserScore");

        const top = (data && data.top) || [];
        const me = (data && data.me) || null;

        // ТОП-3
        if (topEl) {
            topEl.innerHTML = "";
            if (!top.length) {
                const li = document.createElement("li");
                li.textContent = "Поки що немає рекордів";
                topEl.appendChild(li);
            } else {
                top.forEach((item, idx) => {
                    const li = document.createElement("li");
                    li.textContent = `${idx + 1}. ${item.name}: ${item.score}`;
                    topEl.appendChild(li);
                });
            }
        }

        // Личный рекорд под именем
        if (userScoreEl) {
            if (me && typeof me.score === "number" && me.score > 0) {
                userScoreEl.textContent = `FLAPPY CAKE: ${me.score}`;
            } else {
                userScoreEl.textContent = "FLAPPY CAKE: —";
            }
        }
    }

    // ===== ЗАГРУЗКА ТОП-3 И ЛИЧНОГО РЕКОРДА ИЗ FIRESTORE =====
    async function loadFlappyStatsForCurrentUser() {
        try {
            if (!db || !flappyScoresCollection) {
                console.log("FLAPPY: Firestore не готов на главной, пропускаем загрузку рейтинга");
                return;
            }

            const currentUser = window.MBHA_CURRENT_USER || null;
            const code = currentUser && currentUser.code ?
                String(currentUser.code).toUpperCase() :
                null;

            // --- ТОП-3 по bestScore ---
            const topQuery = flappyScoresCollection
                .orderBy("bestScore", "desc")
                .limit(3);

            const topSnap = await topQuery.get();
            const top = [];
            topSnap.forEach(doc => {
                const d = doc.data() || {};
                const name = d.name || d.code || "PLAYER";
                const score = Number(d.bestScore || 0);
                if (Number.isFinite(score) && score > 0) {
                    top.push({ name, score });
                }
            });

            // --- Личный рекорд текущего пользователя ---
            let me = null;
            if (code) {
                const meSnap = await flappyScoresCollection.doc(code).get();
                if (meSnap.exists) {
                    const d = meSnap.data() || {};
                    const myScore = Number(d.bestScore || 0);
                    if (Number.isFinite(myScore) && myScore > 0) {
                        me = {
                            name: d.name || d.code || "PLAYER",
                            score: myScore
                        };
                    }
                }
            }

            renderFlappyLeaderboard({ top, me });
        } catch (err) {
            console.error("FLAPPY leaderboard Firestore error:", err);
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

        // Глобальный объект для игр / рекордов
        window.MBHA_CURRENT_USER = {
            code: profile.code || null,
            name: profile.name || "GUEST",
            isGuest: mbhaRole !== "user" || !profile.code,
            about: profile.about || "",
            modalVer: getIntroVersion(profile)
        };

        // ==== ОБНОВЛЯЕМ ССЫЛКУ НА ИГРУ ====
        const gameBtn = document.getElementById("gameBtn");
        if (gameBtn) {
            let href = "flappy/index.html";
            const params = new URLSearchParams();

            if (window.MBHA_CURRENT_USER.isGuest || !window.MBHA_CURRENT_USER.code) {
                // гость — просто помечаем guest=1
                params.set("guest", "1");
            } else {
                // юзер — передаём код и имя
                params.set("code", window.MBHA_CURRENT_USER.code);
                params.set("name", window.MBHA_CURRENT_USER.name || "");
            }

            const qs = params.toString();
            if (qs) href += "?" + qs;

            gameBtn.href = href;
        }
        // ==== КОНЕЦ ОБНОВЛЕНИЯ ССЫЛКИ НА ИГРУ ====

        renderProfile(profile);

        // Подтягиваем ТОП-3 и личный рекорд уже из Firestore
        loadFlappyStatsForCurrentUser();

        // ✅ Показываем онбординг только если MODAL_VER ещё не виден
        maybeShowTeamIntro(profile);
    }

    // =================== DONT PUSH BUTTON (user/guest) ===================

    const dontPushUserSound = new Audio("audio/dont-push-user.mp3");
    const dontPushGuestSound = new Audio("audio/dont-push-guest.mp3");

    dontPushUserSound.loop = false;
    dontPushGuestSound.loop = false;

    // =================== DOMContentLoaded ===================
    document.addEventListener("DOMContentLoaded", () => {
        // --- DONT PUSH ---
        const dontPushBtn = document.getElementById("dont-push-btn");
        if (dontPushBtn) {
            dontPushBtn.addEventListener("click", () => {
                const snd = dontPushGuestSound;
                snd.pause();
                snd.currentTime = 0;
                snd.play().catch(() => {});

                const overlay = document.getElementById("dontPushOverlay");
                if (overlay) {
                    overlay.classList.add("is-visible");
                    setTimeout(() => {
                        overlay.classList.remove("is-visible");
                    }, 1000);
                }
            });
        }

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

            // Проверяем, логинился ли уже сегодня
            const savedAuth = loadAuthFromStorage();
            const today = getTodayStr();

            if (savedAuth && savedAuth.lastLogin === today) {
                if (savedAuth.role === "user") {
                    setMbhaRole("user");
                } else {
                    setMbhaRole("guest");
                }

                const params = getUrlParams();
                if (savedAuth.role === "user" && savedAuth.code) {
                    params.set("code", savedAuth.code);
                    params.delete("guest");
                } else {
                    params.set("guest", "1");
                    params.delete("code");
                }
                updateUrlParams(params);

                initUserProfile();
                return;
            }

            if (codeModal) {
                showCodeModal();
            }

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
                        showError("Черевічкі мої! А ТАКИХ НЕМА");
                        return;
                    }

                    const params = getUrlParams();
                    params.set("code", raw);
                    params.delete("guest");
                    updateUrlParams(params);

                    setMbhaRole("user");

                    saveAuthToStorage("user", raw, getField(usersDb[raw], "PLAYER") || null);

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

                saveAuthToStorage("guest", null, null);

                hideCodeModal();
                initUserProfile();
            });

            codeInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    codeSubmitBtn.click();
                }
            });
        }

        // Запускаем логин/профиль
        initCodeFlow();

        // =================== LOGOUT ===================

        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                clearAuthStorage();
                setMbhaRole("guest");

                window.MBHA_CURRENT_USER = {
                    code: null,
                    name: "GUEST",
                    isGuest: true,
                    about: "",
                    modalVer: "0"
                };

                const params = getUrlParams();
                params.delete("code");
                params.delete("guest");
                const qs = params.toString();
                const newUrl = window.location.pathname + (qs ? "?" + qs : "");
                window.history.replaceState(null, "", newUrl);

                renderProfile(normalizeProfile(makeGuestProfile(null)));

                const topEl = document.getElementById("flappyTop3");
                if (topEl) {
                    topEl.innerHTML = "";
                    const li = document.createElement("li");
                    li.textContent = "Поки що немає рекордів";
                    topEl.appendChild(li);
                }

                const userScoreEl = document.getElementById("flappyUserScore");
                if (userScoreEl) {
                    userScoreEl.textContent = "FLAPPY CAKE: —";
                }

                const codeModal = document.getElementById("codeModal");
                if (codeModal) {
                    const anyInput = document.getElementById("codeInput");
                    if (anyInput) anyInput.value = "";
                    codeModal.classList.add("code-modal--visible");
                }

                // жёсткий ресет (чтоб точно всё сбросилось)
                location.reload();
            });
        }

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
                audio
                    .play()
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

        // На этом main.js заканчивается.
    });
})();