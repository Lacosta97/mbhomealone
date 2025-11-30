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
    // Парсер CSV с поддержкой кавычек и запятых внутри поля
    function parseCsv(text) {
        if (!text) return [];

        const lines = text.replace(/\r\n/g, "\n").split("\n");
        if (!lines.length) return [];

        const headers = splitCsvLine(lines[0]);

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line || !line.trim()) continue;

            const cells = splitCsvLine(line);
            const obj = {};

            headers.forEach((h, idx) => {
                const key = (h || "").trim();
                const raw = cells[idx] != null ? cells[idx] : "";
                obj[key] = raw.trim();
            });

            rows.push(obj);
        }

        return rows;

        // вспомогательная: аккуратно режем строку по запятым
        function splitCsvLine(line) {
            const result = [];
            let current = "";
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const ch = line[i];

                if (ch === '"') {
                    // экранированная кавычка внутри "..."
                    if (inQuotes && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (ch === "," && !inQuotes) {
                    // конец ячейки
                    result.push(current);
                    current = "";
                } else {
                    current += ch;
                }
            }
            result.push(current);
            return result;
        }
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
    // ===== MBHA: SCENE SWITCH + 400K COMIC =====

    const MBHA_SCENE_THRESHOLD = 400000;

    function mbhaUpdateScenesByTotal(totalNumber) {
        const idleScene = document.querySelector(".ha-scene--idle");
        const scene1 = document.querySelector(".ha-scene--scene1");

        if (!idleScene && !scene1) return;

        if (totalNumber >= MBHA_SCENE_THRESHOLD) {
            if (idleScene) idleScene.style.display = "none";
            if (scene1) scene1.style.display = "block";
        } else {
            if (idleScene) idleScene.style.display = "block";
            if (scene1) scene1.style.display = "none";
        }
    }

    function mbhaGetScene400Key(profile) {
        const code = profile && profile.code ? String(profile.code).trim().toUpperCase() : "GUEST";
        return "mbha_scene400_" + code;
    }

    function mbhaHasScene400Seen(profile) {
        try {
            return localStorage.getItem(mbhaGetScene400Key(profile)) === "1";
        } catch {
            return false;
        }
    }

    function mbhaMarkScene400Seen(profile) {
        try {
            localStorage.setItem(mbhaGetScene400Key(profile), "1");
        } catch {}
    }

    function mbhaShouldShowScene400(profile, totalNumber) {
        return totalNumber >= MBHA_SCENE_THRESHOLD && !mbhaHasScene400Seen(profile);
    }

    function mbhaOpenScene400Modal(profile, onClose) {
        const modal = document.getElementById("scene400Modal");
        const closeBtn = document.getElementById("scene400CloseBtn");
        if (!modal || !closeBtn) return;

        function cleanup() {
            document.body.style.overflow = "";
            closeBtn.removeEventListener("click", onClickClose);
            modal.removeEventListener("click", onBackdropClick);
        }

        function onClickClose() {
            modal.classList.remove("scene400-modal--visible");
            cleanup();
            if (typeof onClose === "function") onClose();
        }

        function onBackdropClick(e) {
            if (e.target === modal) onClickClose();
        }

        modal.classList.add("scene400-modal--visible");
        document.body.style.overflow = "hidden";

        closeBtn.addEventListener("click", onClickClose);
        modal.addEventListener("click", onBackdropClick);

        mbhaMarkScene400Seen(profile);
    }

    window.MBHA_SCENE400_CAN_TRIGGER = false;
    window.MBHA_SCENE400_PROFILE = null;

    window.mbhaOpenScene400ForCurrentProfile = function(onClose) {
        const profile = window.MBHA_SCENE400_PROFILE || { code: null };
        mbhaOpenScene400Modal(profile, onClose);
    };


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
        if (!shouldShowTeamIntro(profile)) return;

        const modal = document.getElementById("teamModal");
        if (!modal) return;

        const aboutEl = document.getElementById("teamAboutText");
        const msgEl = document.getElementById("teamMessage");
        const photoEl = modal.querySelector(".team-modal__photo img");
        const btnKevin = document.getElementById("teamKevinBtn");
        const btnBandits = document.getElementById("teamBanditsBtn");
        const closeBtn = document.getElementById("teamModalClose");

        if (!aboutEl || !msgEl || !photoEl || !btnKevin || !btnBandits) return;

        // reset
        aboutEl.textContent = "";
        msgEl.textContent = "";
        btnKevin.disabled = false;
        btnBandits.disabled = false;

        if (closeBtn) {
            closeBtn.classList.remove("team-modal__close--visible");
            closeBtn.onclick = null;
        }

        // аватар
        const avatarSrc = getAvatarSrc(profile);
        photoEl.onerror = function() {
            if (!photoEl.src.includes(GUEST_AVATAR)) {
                photoEl.src = GUEST_AVATAR;
            }
        };
        photoEl.src = avatarSrc;

        // about
        const fullText = (profile.about && profile.about.trim()) ?
            profile.about.trim() :
            `Name: ${profile.name || "PLAYER"}`;

        if (teamTypeAudio) {
            try { teamTypeAudio.pause(); } catch (e) {}
        }
        teamTypeAudio = new Audio("audio/typewriter.mp3");
        teamTypeAudio.loop = false;
        teamTypeAudio.currentTime = 0;

        let idx = 0;
        const speed = 35;

        function typeNext() {
            if (idx === 0) {
                teamTypeAudio.play().catch(() => {});
            }

            if (idx < fullText.length) {
                aboutEl.textContent += fullText.charAt(idx);
                idx++;
                setTimeout(typeNext, speed);
            } else {
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

            // ✅ запуск intro-комикса после закрытия выбора команды
            if (typeof window.openIntroComics === "function") {
                window.openIntroComics();
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

            markTeamIntroSeen(profile);

            msgEl.textContent =
                "ХАХ! НЕ ВИГАДУЙ ДУРНИЦЬ, СВОЮ КОМАНДУ ДІЗНАЄШСЯ ПРИ ОГОЛОШЕННІ РЕЗУЛЬТАТІВ 🐋💨";

            // показываем крестик, окно больше само не закрывается
            if (closeBtn) {
                closeBtn.classList.add("team-modal__close--visible");
                closeBtn.onclick = closeTeamModal;
            }
        }

        btnKevin.onclick = handleChoice;
        btnBandits.onclick = handleChoice;

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

        // === SCENE 1 + COMIC 400K ===
        window.MBHA_SCENE400_PROFILE = { code: profile.code || null };

        const numericTotal = parseScore(profile.total || 0);

        // переключаем idle / scene1
        mbhaUpdateScenesByTotal(numericTotal);

        const willShowTeamIntro = shouldShowTeamIntro(profile);
        window.MBHA_SCENE400_CAN_TRIGGER = mbhaShouldShowScene400(profile, numericTotal);

        // если интро уже показывали – можно сразу показать комикс сцены
        if (!willShowTeamIntro && window.MBHA_SCENE400_CAN_TRIGGER) {
            mbhaOpenScene400Modal({ code: profile.code || null });
        }

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
        // =================== SITE LOCK (ONLY CD34 ALLOWED) ===================

        const SITE_LOCK_ENABLED = false; // ← ВОТ ЭТОЙ СТРОКОЙ УПРАВЛЯЕМ

        function checkSiteLock() {
            if (!SITE_LOCK_ENABLED) return true; // 🔓 лок выключен

            const ALLOWED_CODE = "CD34";

            const saved = loadAuthFromStorage();
            const urlCode = getCodeFromUrl();
            const activeCode = urlCode || (saved && saved.code);

            if (activeCode === ALLOWED_CODE) {
                console.log("MBHA: site unlocked for", ALLOWED_CODE);
                return true;
            }

            const lock = document.getElementById("siteLock");
            if (lock) {
                lock.classList.add("site-lock--visible");
            }

            document.body.style.overflow = "hidden";
            return false;
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
    // =================== MBHA: CHARACTER FRAME ANIMATION ===================

    document.addEventListener("DOMContentLoaded", () => {
        const kevinImg = document.querySelector(".ha-kevin img");
        const marvImg = document.querySelector(".ha-marv img");
        const harryImg = document.querySelector(".ha-harry img");
        const kevinWrap = document.querySelector(".ha-kevin");

        if (!kevinImg || !marvImg || !harryImg || !kevinWrap) {
            console.warn("MBHA: персонажи не найдены в DOM");
            return;
        }

        // --- Кол-во кадров ---
        const KEVIN_FRAMES = 10;
        const MARV_FRAMES = 4;
        const HARRY_FRAMES = 6;

        // --- Скорости (мс) ---
        const KEVIN_SPEED = 120; // Кевин — как был
        const MARV_SPEED = 320; // в 2 раза медленнее
        const HARRY_SPEED = 280; // в 2 раза медленнее

        // --- Путь к кадрам ---
        function kevinSrc(i) {
            return `img/sprites/kevin/kevin_idle_${String(i).padStart(2, "0")}.png`;
        }

        function marvSrc(i) {
            return `img/sprites/marv/marv_idle_${String(i).padStart(2, "0")}.png`;
        }

        function harrySrc(i) {
            return `img/sprites/harry/harry_idle_${String(i).padStart(2, "0")}.png`;
        }

        // ================== MARV & HARRY (просто медленнее) ==================

        let marvFrame = 1;
        setInterval(() => {
            marvFrame = marvFrame < MARV_FRAMES ? marvFrame + 1 : 1;
            marvImg.src = marvSrc(marvFrame);
        }, MARV_SPEED);

        let harryFrame = 1;
        setInterval(() => {
            harryFrame = harryFrame < HARRY_FRAMES ? harryFrame + 1 : 1;
            harryImg.src = harrySrc(harryFrame);
        }, HARRY_SPEED);

        // ================== KEVIN: ЧЕРДАК, ВПРАВО–ВЛЕВО ==================

        // Состояния: стоит лицом, идёт вправо, опять стоит, идёт влево
        const PHASE_IDLE_RIGHT = "idle_right";
        const PHASE_WALK_RIGHT = "walk_right";
        const PHASE_IDLE_LEFT = "idle_left";
        const PHASE_WALK_LEFT = "walk_left";

        let kevinPhase = PHASE_IDLE_RIGHT;
        let phaseTicks = 0;

        // смещение по X (от исходной позиции .ha-kevin)
        let kevinOffsetX = 0;
        const STEP_PX = 6; // шаг за тик
        const MAX_OFFSET = 24; // насколько далеко уходит от центра вправо/влево

        let kevinWalkFrame = 2; // ходьба — кадры 2..10

        function nextKevinWalkFrame() {
            kevinWalkFrame++;
            if (kevinWalkFrame > KEVIN_FRAMES) {
                kevinWalkFrame = 2;
            }
            kevinImg.src = kevinSrc(kevinWalkFrame);
        }

        function applyKevinTransform() {
            // движение по X, масштабирование оставляем в CSS (на img)
            kevinWrap.style.transform = `translateX(${kevinOffsetX}px)`;
        }

        // =================== MBHA: KEVIN WALK (01–10 ПО ТВОЕМУ СЦЕНАРИЮ) ===================
        (function setupKevinWalkProper() {
            const wrapper = document.querySelector(".ha-kevin");
            if (!wrapper) return;

            const img = wrapper.querySelector("img");
            if (!img) return;

            // Хелпер для пути к кадрам
            function kevinSrc(n) {
                return `img/sprites/kevin/kevin_idle_${String(n).padStart(2, "0")}.png`;
            }

            // Группы кадров по твоей логике
            const FRAMES_IDLE_CENTER = [1, 2]; // смотрит на зрителя слева/центр
            const FRAMES_WALK_RIGHT = [3, 4]; // идёт вправо
            const FRAMES_IDLE_RIGHT = [6, 7]; // смотрит на зрителя справа
            const FRAMES_WALK_LEFT = [8, 9]; // идёт влево

            // Берём базовый left из CSS (.ha-kevin { left: 28%; ... })
            const computed = getComputedStyle(wrapper);
            const baseLeft = parseFloat(computed.left) || 0;

            let offset = 0; // отклонение от базы
            const STEP_PX = 3; // длина шага
            const MAX_OFFSET = 22; // насколько далеко уходит от центра

            const SPEED = 120; // мс между тиками

            // Состояния анимации
            const STATE_IDLE_CENTER = 0;
            const STATE_WALK_RIGHT = 1;
            const STATE_IDLE_RIGHT = 2;
            const STATE_WALK_LEFT = 3;

            let state = STATE_IDLE_CENTER;
            let tick = 0;
            let frameIndex = 0;

            // Ставим стартовый кадр
            img.src = kevinSrc(1);
            wrapper.style.left = baseLeft + "px";

            function setFrameFrom(list) {
                img.src = kevinSrc(list[frameIndex % list.length]);
            }

            function stepWalk(list, direction) {
                // direction: 1 — вправо, -1 — влево
                setFrameFrom(list);
                frameIndex = (frameIndex + 1) % list.length;

                offset += STEP_PX * direction;
                if (offset > MAX_OFFSET) offset = MAX_OFFSET;
                if (offset < -MAX_OFFSET) offset = -MAX_OFFSET;

                wrapper.style.left = (baseLeft + offset) + "px";
            }

            setInterval(() => {
                tick++;

                switch (state) {
                    case STATE_IDLE_CENTER:
                        // 01–02 — немного «дышит» на месте
                        setFrameFrom(FRAMES_IDLE_CENTER);
                        if (tick % 2 === 0) {
                            frameIndex = (frameIndex + 1) % FRAMES_IDLE_CENTER.length;
                        }
                        wrapper.style.left = baseLeft + "px";
                        offset = 0;

                        if (tick >= 10) { // постоял → идём вправо
                            tick = 0;
                            frameIndex = 0;
                            state = STATE_WALK_RIGHT;
                        }
                        break;

                    case STATE_WALK_RIGHT:
                        // 03–04–05 — движение вправо
                        stepWalk(FRAMES_WALK_RIGHT, 1);
                        if (tick >= 9) { // чуть походил → остановился справа
                            tick = 0;
                            frameIndex = 0;
                            state = STATE_IDLE_RIGHT;
                        }
                        break;

                    case STATE_IDLE_RIGHT:
                        // 06–07 — стоит справа, смотрит на зрителя
                        setFrameFrom(FRAMES_IDLE_RIGHT);
                        if (tick % 2 === 0) {
                            frameIndex = (frameIndex + 1) % FRAMES_IDLE_RIGHT.length;
                        }

                        if (tick >= 10) { // постоял → идём влево
                            tick = 0;
                            frameIndex = 0;
                            state = STATE_WALK_LEFT;
                        }
                        break;

                    case STATE_WALK_LEFT:
                        // 08–09–10 — идёт влево обратно
                        stepWalk(FRAMES_WALK_LEFT, -1);
                        if (tick >= 9) { // вернулся → снова в центр
                            tick = 0;
                            frameIndex = 0;
                            state = STATE_IDLE_CENTER;
                        }
                        break;
                }
            }, SPEED);
        })();

    });
    // =================== MBHA: CHARACTER FRAME ANIMATION · SCENE 1 ===================

    document.addEventListener("DOMContentLoaded", () => {
        const kevinScene1Img = document.querySelector(".ha-kevin-scene1 img");
        const marvScene1Img = document.querySelector(".ha-marv-scene1 img");
        const harryScene1Img = document.querySelector(".ha-harry-scene1 img");

        if (!kevinScene1Img || !marvScene1Img || !harryScene1Img) {
            console.warn("MBHA: scene1 персонажи не найдены в DOM");
            return;
        }

        // --- Кол-во кадров SCENE 1 ---
        const KEVIN_SCENE1_FRAMES = 3; // kevin_scene1_01...03
        const MARV_SCENE1_FRAMES = 3; // marv_scene1_01...03
        const HARRY_SCENE1_FRAMES = 7; // harry_scene1_01...07

        // --- Пути к кадрам SCENE 1 ---
        function kevinScene1Src(i) {
            return `img/sprites/kevin/kevin_scene1_${String(i).padStart(2, "0")}.png`;
        }

        function marvScene1Src(i) {
            return `img/sprites/marv/marv_scene1_${String(i).padStart(2, "0")}.png`;
        }

        function harryScene1Src(i) {
            return `img/sprites/harry/harry_scene1_${String(i).padStart(2, "0")}.png`;
        }

        // --- Скорости анимации (играешься потом, как по ощущениям) ---
        const KEVIN_SCENE1_SPEED = 500; // мс между кадрами
        const MARV_SCENE1_SPEED = 220;
        const HARRY_SCENE1_SPEED = 250;

        // ========== KEVIN SCENE 1 ==========
        let kevinScene1Frame = 1;
        kevinScene1Img.src = kevinScene1Src(kevinScene1Frame);

        setInterval(() => {
            kevinScene1Frame =
                kevinScene1Frame < KEVIN_SCENE1_FRAMES ? kevinScene1Frame + 1 : 1;
            kevinScene1Img.src = kevinScene1Src(kevinScene1Frame);
        }, KEVIN_SCENE1_SPEED);

        // ========== MARV SCENE 1 ==========
        let marvScene1Frame = 1;
        marvScene1Img.src = marvScene1Src(marvScene1Frame);

        setInterval(() => {
            marvScene1Frame =
                marvScene1Frame < MARV_SCENE1_FRAMES ? marvScene1Frame + 1 : 1;
            marvScene1Img.src = marvScene1Src(marvScene1Frame);
        }, MARV_SCENE1_SPEED);

        // ========== HARRY SCENE 1 ==========
        let harryScene1Frame = 1;
        harryScene1Img.src = harryScene1Src(harryScene1Frame);

        setInterval(() => {
            harryScene1Frame =
                harryScene1Frame < HARRY_SCENE1_FRAMES ? harryScene1Frame + 1 : 1;
            harryScene1Img.src = harryScene1Src(harryScene1Frame);
        }, HARRY_SCENE1_SPEED);
    });

    // =================== INTRO COMICS LOGIC ===================

    (function initIntroComics() {
        const introModal = document.getElementById("introModal");
        const introImage = document.getElementById("introImage");
        const introPrevBtn = document.getElementById("introPrevBtn");
        const introNextBtn = document.getElementById("introNextBtn");
        const introCloseBtn = document.getElementById("introCloseBtn");
        const introCounter = document.getElementById("introCounter");
        const introAvatar = document.getElementById("introAvatar");
        const introStartBtn = document.getElementById("introStartBtn");

        if (!introModal || !introImage || !introPrevBtn || !introNextBtn || !introCloseBtn || !introCounter || !introAvatar || !introStartBtn) {
            return;
        }

        const introPages = [
            "img/comics/intro/page-1.png",
            "img/comics/intro/page-2.png",
            "img/comics/intro/page-3.png",
        ];

        let introIndex = 0;

        function updateIntroView() {
            introImage.src = introPages[introIndex];
            introCounter.textContent = `${introIndex + 1} / ${introPages.length}`;

            // Аватар и START GAME только на 3-й странице
            if (introIndex === 2) {
                introAvatar.style.display = "block";
                introStartBtn.style.display = "block";
            } else {
                introAvatar.style.display = "none";
                introStartBtn.style.display = "none";
            }

            // Стрелки
            introPrevBtn.style.display = introIndex === 0 ? "none" : "block";
            introNextBtn.style.display = introIndex === introPages.length - 1 ? "none" : "block";
        }

        function openIntro() {
            introIndex = 0;
            updateIntroView();
            introModal.classList.add("intro-modal--visible");
            document.body.style.overflow = "hidden";

            // Подставляем аватар юзера
            const avatarImg = introAvatar.querySelector("img");
            if (avatarImg) {
                if (window.MBHA_CURRENT_USER && window.MBHA_CURRENT_USER.code) {
                    avatarImg.src = `img/avatars/${window.MBHA_CURRENT_USER.code}.png`;
                } else {
                    avatarImg.src = "img/avatars/GUEST.png";
                }
            }
        }

        function closeIntro() {
            introModal.classList.remove("intro-modal--visible");
            document.body.style.overflow = "";
        }

        introNextBtn.addEventListener("click", () => {
            if (introIndex < introPages.length - 1) {
                introIndex++;
                updateIntroView();
            }
        });

        introPrevBtn.addEventListener("click", () => {
            if (introIndex > 0) {
                introIndex--;
                updateIntroView();
            }
        });

        introCloseBtn.addEventListener("click", closeIntro);

        // START GAME: закрываем интро и открываем RULES
        introStartBtn.addEventListener("click", () => {
            closeIntro();
            const rulesBtn = document.getElementById("rulesBtn");

            if (window.MBHA_SCENE400_CAN_TRIGGER &&
                typeof window.mbhaOpenScene400ForCurrentProfile === "function") {

                window.mbhaOpenScene400ForCurrentProfile(() => {
                    if (rulesBtn) rulesBtn.click();
                });

            } else {
                if (rulesBtn) rulesBtn.click();
            }
        });


        // Глобалка, чтобы вызывать из teamModal
        window.openIntroComics = openIntro;
    })();



})();