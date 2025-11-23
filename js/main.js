// MBHA main JS – коды, гости, музыка, правила
(function() {
    // =================== MBHA: USERS FROM GOOGLE SHEETS ===================

    const SHEET_URL =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vRWO7yjYAibcHlzSacrVRoI59NWF3R0BvK4In7Hb2Gf6vD8Raco_QOdGUJiS7ckRARsCbc3Rz5wUHUu/pub?gid=0&single=true&output=csv";
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
            TOTAL: "0",
        };
    }

    function normalizeProfile(row) {
        return {
            name: row["PLAYER"] || "GUEST",
            code: (row["CODE"] || "").trim().toUpperCase(),
            personalAccount: row["PERSONAL ACCOUNT"] || "-----",
            total: row["TOTAL"] || "0",
            teamKevin: row["TEAM KEVIN"] || "0",
            teamBandits: row["TEAM OF BANDITS"] || "0",
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
        mbhaRole = role === "user" ? "user" : "guest";
        // если нужно — можно использовать в других скриптах
        window.mbhaRole = mbhaRole;
    }

    // =================== DOMContentLoaded ===================
    document.addEventListener("DOMContentLoaded", () => {
        // --- DONT PUSH ---
        const dontPushBtn = document.getElementById("dont-push-btn");
        if (dontPushBtn) {
            dontPushBtn.addEventListener("click", () => {
                // звук один для всех теперь
                const snd = dontPushGuestSound;

                snd.pause();
                snd.currentTime = 0;
                snd.play().catch(() => {});

                // показываем картинку
                const overlay = document.getElementById("dontPushOverlay");
                if (overlay) {
                    overlay.classList.add("is-visible");

                    // скрываем через 1 секунду
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