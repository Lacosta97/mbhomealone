// MBHA main JS – сюда позже поедет логика (коды, подарки, игра и т.д.)
(function() {
    // ==== RULES ====
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

    // ==== MUSIC ====
    const musicBtn = document.getElementById("musicBtn");

    // Путь к треку в проекте
    const musicUrl = "audio/song1.mp3";

    let audio = null;
    let isPlaying = false;

    if (musicBtn) {
        audio = new Audio(musicUrl);
        audio.loop = true; // трек зациклен; убери, если не нужно

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
            audio.play().then(() => {
                isPlaying = true;
                updateVisual();
            }).catch((err) => {
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

        // если когда-то уберёшь loop — при завершении трека сбросим анимацию
        audio.addEventListener("ended", function() {
            isPlaying = false;
            updateVisual();
        });
    }
})();