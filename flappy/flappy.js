document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    const overlay = document.getElementById("overlay");
    const overlayTitle = document.getElementById("overlayTitle");
    const overlayText = document.getElementById("overlayText");
    const startBtn = document.getElementById("startBtn");

    const scoreValue = document.getElementById("scoreValue");
    const bestScoreValue = document.getElementById("bestScoreValue");

    // ===== API РЕКОРДОВ FLAPPY CAKE =====
    const SCORES_API_URL =
        "https://script.google.com/macros/s/AKfycbzoMPF6NbJWBTddFUrT1PJZNqs4vdonPJw8vxiYETsxtiJFTMY4EogHzWCd_lQoFpt1/exec";

    // читаем авторизацию, которую сохраняет main.js
    function loadAuthFromStorage() {
        try {
            const raw = localStorage.getItem("mbhaAuth");
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    // ===== SPRITE: TORT =====
    const cakeImg = new Image();
    cakeImg.src = "img/tort.png";
    let cakeLoaded = false;
    cakeImg.onload = () => {
        cakeLoaded = true;
    };

    // ===== GAME CONSTANTS =====
    const width = canvas.width;
    const height = canvas.height;

    const gravity = 0.4;
    const jumpVelocity = -7;
    const pipeSpeed = 2.5;
    const pipeWidth = 60;
    const pipeGap = 150;

    const groundHeight = 80;

    // ===== CHRISTMAS BACKGROUND: STARS + SNOW + CITY + GARLAND =====
    let starTime = 0;

    const stars = Array.from({ length: 60 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height * 0.7,
        s: Math.random() * 2 + 1,
        speed: Math.random() * 0.02 + 0.01
    }));

    const snowflakes = Array.from({ length: 90 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2 + 1,
        vy: Math.random() * 0.6 + 0.4,
        vx: (Math.random() - 0.5) * 0.2
    }));

    const horizonY = height - groundHeight - 20;

    const cityBuildings = (() => {
        const arr = [];
        let xPos = -20;

        while (xPos < width + 40) {
            const w = 30 + Math.random() * 40;
            const h = 40 + Math.random() * 80;
            const topY = horizonY - h;

            const building = {
                x: xPos,
                w,
                topY,
                h,
                windows: []
            };

            const cols = 3 + Math.floor(Math.random() * 2);
            const rows = 3 + Math.floor(Math.random() * 2);

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (Math.random() < 0.75) {
                        const wx = building.x + 6 + c * ((w - 12) / cols);
                        const wy = topY + 6 + r * ((h - 18) / rows);

                        const palette = ["#fde68a", "#fecaca", "#bbf7d0"];
                        const color = palette[Math.floor(Math.random() * palette.length)];

                        building.windows.push({ x: wx, y: wy, color });
                    }
                }
            }

            arr.push(building);
            xPos += w + 8 + Math.random() * 10;
        }

        return arr;
    })();

    const garlandY = height * 0.22;
    const garlandBulbs = (() => {
        const bulbs = [];
        const step = 26;
        const colors = ["#f97373", "#facc15", "#4ade80", "#38bdf8", "#a855f7"];

        for (let x = -10; x < width + 20; x += step) {
            const wobble = Math.sin(x * 0.02) * 6;
            bulbs.push({
                x,
                y: garlandY + wobble,
                color: colors[Math.floor(Math.random() * colors.length)],
                phase: Math.random() * Math.PI * 2
            });
        }

        return bulbs;
    })();

    function drawBackground() {
        starTime += 0.03;

        ctx.fillStyle = "#050816";
        ctx.fillRect(0, 0, width, height);

        stars.forEach(st => {
            const flicker = Math.sin(starTime * st.speed + st.x * 0.3) * 0.5 + 0.5;
            const alpha = 0.3 + flicker * 0.7;

            ctx.fillStyle = `rgba(248, 250, 252, ${alpha})`;
            ctx.fillRect(st.x, st.y, st.s, st.s);
        });

        ctx.strokeStyle = "#1f2937";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-20, garlandY);
        for (let x = -20; x <= width + 20; x += 15) {
            const wobble = Math.sin(x * 0.02) * 6;
            ctx.lineTo(x, garlandY + wobble);
        }
        ctx.stroke();

        garlandBulbs.forEach(b => {
            const flick = Math.sin(starTime * 2 + b.phase) * 0.5 + 0.5;
            const alpha = 0.4 + flick * 0.6;

            ctx.globalAlpha = alpha * 0.4;
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        cityBuildings.forEach(b => {
            ctx.fillStyle = "#020617";
            ctx.fillRect(b.x, b.topY, b.w, b.h);

            ctx.fillStyle = "#111827";
            ctx.fillRect(b.x, b.topY, b.w, 3);

            ctx.fillStyle = "#e5f2ff";
            ctx.fillRect(b.x, b.topY - 3, b.w, 4);

            b.windows.forEach(wi => {
                const flicker = Math.sin(starTime * 1.5 + wi.x * 0.4) * 0.5 + 0.5;
                const alpha = 0.4 + flicker * 0.6;
                ctx.fillStyle = wi.color;
                ctx.globalAlpha = alpha;
                ctx.fillRect(wi.x, wi.y, 4, 7);
                ctx.globalAlpha = 1;
            });
        });

        snowflakes.forEach(s => {
            s.y += s.vy;
            s.x += s.vx;

            if (s.y > height) {
                s.y = -5;
                s.x = Math.random() * width;
            }
            if (s.x < -10) s.x = width + 10;
            if (s.x > width + 10) s.x = -10;

            ctx.fillStyle = "#e5f2ff";
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // === ВАЖНО: ВОТ ЭТА ФУНКЦИЯ, КОТОРОЙ НЕ ХВАТАЛО ===
    function drawGround() {
        const groundY = height - groundHeight;

        ctx.fillStyle = "#e5f2ff";
        ctx.fillRect(0, groundY, width, groundHeight);

        ctx.fillStyle = "#93c5fd";
        ctx.fillRect(0, groundY, width, 3);

        const driftH = 10;
        for (let x = 0; x < width; x += 28) {
            ctx.fillStyle = "#f9fafb";
            ctx.beginPath();
            ctx.ellipse(x + 14, groundY + 6, 16, driftH, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ===== GAME STATE =====
    let gameState = "start";

    let bird = {
        x: width / 4,
        y: height / 2,
        radius: 18,
        vy: 0
    };

    let pipes = [];
    let score = 0;
    let bestScore = 0;

    // ===== ОТПРАВКА РЕКОРДА В GOOGLE SCRIPT =====
    async function submitFlappyScore(finalScore) {
        try {
            if (!window.fetch || !SCORES_API_URL) return;

            let user = null;

            if (window.MBHA_CURRENT_USER) {
                user = window.MBHA_CURRENT_USER;
            } else {
                const saved = loadAuthFromStorage();
                if (saved && saved.role === "user" && saved.code) {
                    user = {
                        code: saved.code,
                        name: saved.name || saved.code,
                        isGuest: false
                    };
                }
            }

            if (!user || user.isGuest || !user.code) {
                console.log("FLAPPY: не отправляем рекорд (гость или нет кода)", user);
                return;
            }

            const payload = {
                code: String(user.code),
                name: String(user.name || user.code),
                score: Number(finalScore || 0)
            };

            console.log("FLAPPY: отправляем рекорд", payload);

            const res = await fetch(SCORES_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const text = await res.text();
            console.log("FLAPPY: статус ответа", res.status, "тело:", text);

            let data = null;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.warn("FLAPPY: ответ не JSON, см. выше текст");
                return;
            }

            if (!res.ok || !data.ok) {
                console.warn("FLAPPY: сервер вернул ошибку", data);
                return;
            }
        } catch (e) {
            console.error("FLAPPY: ошибка при отправке рекорда", e);
        }
    }

    // ===== ДОПОМІЖНІ ФУНКЦІЇ =====
    function resetGame() {
        bird.x = width / 4;
        bird.y = height / 2;
        bird.vy = 0;

        pipes = [];
        score = 0;
        scoreValue.textContent = score;

        gameState = "start";
        overlay.style.display = "flex";
        overlayTitle.textContent = "FLAPPY CAKE";
        overlayText.innerHTML =
            'ПК: натисни <b>пробіл</b> або <b>клік мишкою</b><br>Телефон: зроби <b>тап по екрану</b>';
        startBtn.textContent = "Почати";
    }

    function startGame() {
        if (gameState === "playing") return;
        gameState = "playing";
        overlay.style.display = "none";

        if (pipes.length === 0) {
            spawnPipe();
        }
    }

    function gameOver() {
        gameState = "gameover";
        overlay.style.display = "flex";
        overlayTitle.textContent = "Гру завершено";
        overlayText.innerHTML = `Твій результат: <b>${score}</b><br>Натисни, щоб зіграти ще раз`;
        startBtn.textContent = "Ще раз";

        if (score > bestScore) {
            bestScore = score;
            bestScoreValue.textContent = bestScore;
        }

        submitFlappyScore(score);
    }

    function spawnPipe() {
        const minTop = 50;
        const maxTop = height - groundHeight - pipeGap - 50;
        const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;

        pipes.push({
            x: width + 40,
            top: topHeight,
            passed: false
        });
    }

    function drawBird() {
        if (!cakeLoaded) return;

        ctx.save();
        ctx.translate(bird.x, bird.y);

        const maxAngle = Math.PI / 10;
        let angle = (bird.vy / 10) * maxAngle;
        angle = Math.max(-maxAngle, Math.min(maxAngle, angle));
        ctx.rotate(angle);

        const size = bird.radius * 3;

        ctx.drawImage(cakeImg, -size / 2, -size / 2, size, size);

        ctx.restore();
    }

    function drawPipes() {
        const groundY = height - groundHeight;

        pipes.forEach(pipe => {
            const x = pipe.x;
            const gapTop = pipe.top;
            const gapBottom = pipe.top + pipeGap;

            const w = pipeWidth;

            const light = "#7cd3ff";
            const mid = "#37aee0";
            const dark = "#0b5e88";
            const border = "#083b55";

            const topH = gapTop;
            if (topH > 0) {
                const grdTop = ctx.createLinearGradient(0, 0, 0, topH);
                grdTop.addColorStop(0, light);
                grdTop.addColorStop(0.5, mid);
                grdTop.addColorStop(1, dark);

                ctx.fillStyle = grdTop;
                ctx.fillRect(x, 0, w, topH);

                ctx.fillStyle = "#04314a";
                ctx.fillRect(x, topH - 8, w, 8);

                ctx.strokeStyle = border;
                ctx.lineWidth = 4;
                ctx.strokeRect(x, 0, w, topH);

                ctx.fillStyle = border;
                ctx.font = "bold 22px 'Pixelify Sans', system-ui, sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("MB", x + w / 2, topH / 2);
            }

            const bottomH = groundY - gapBottom;
            if (bottomH > 0) {
                const grdBottom = ctx.createLinearGradient(
                    0,
                    gapBottom,
                    0,
                    gapBottom + bottomH
                );
                grdBottom.addColorStop(0, dark);
                grdBottom.addColorStop(0.5, mid);
                grdBottom.addColorStop(1, light);

                ctx.fillStyle = grdBottom;
                ctx.fillRect(x, gapBottom, w, bottomH);

                ctx.fillStyle = "#04314a";
                ctx.fillRect(x, gapBottom, w, 8);

                ctx.strokeStyle = border;
                ctx.lineWidth = 4;
                ctx.strokeRect(x, gapBottom, w, bottomH);

                ctx.fillStyle = border;
                ctx.font = "bold 22px 'Pixelify Sans', system-ui, sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("MB", x + w / 2, gapBottom + bottomH / 2);
            }
        });
    }

    function drawScoreOnCanvas() {
        ctx.fillStyle = "#f9fafb";
        ctx.font = "28px 'Pixelify Sans', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(score, width / 2, 50);
    }

    function updateBird() {
        bird.vy += gravity;
        bird.y += bird.vy;

        if (bird.y - bird.radius < 0) {
            bird.y = bird.radius;
            bird.vy = 0;
        }

        if (bird.y + bird.radius > height - groundHeight) {
            bird.y = height - groundHeight - bird.radius;
            gameOver();
        }
    }

    function updatePipes() {
        for (let i = pipes.length - 1; i >= 0; i--) {
            const pipe = pipes[i];
            pipe.x -= pipeSpeed;

            if (pipe.x + pipeWidth < 0) {
                pipes.splice(i, 1);
                continue;
            }

            if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
                pipe.passed = true;
                score++;
                scoreValue.textContent = score;
            }
        }

        if (pipes.length === 0 || pipes[pipes.length - 1].x < width - 200) {
            spawnPipe();
        }
    }

    function checkCollisions() {
        for (const pipe of pipes) {
            const inX =
                bird.x + bird.radius > pipe.x &&
                bird.x - bird.radius < pipe.x + pipeWidth;

            if (!inX) continue;

            const gapTop = pipe.top;
            const gapBottom = pipe.top + pipeGap;

            if (bird.y - bird.radius < gapTop || bird.y + bird.radius > gapBottom) {
                gameOver();
                break;
            }
        }
    }

    function loop() {
        ctx.clearRect(0, 0, width, height);

        drawBackground();
        drawPipes();
        drawGround(); // <-- земля снова есть
        drawBird();
        drawScoreOnCanvas();

        if (gameState === "playing") {
            updateBird();
            updatePipes();
            checkCollisions();
        }

        requestAnimationFrame(loop);
    }

    function flap() {
        if (gameState === "start") {
            startGame();
        } else if (gameState === "playing") {
            bird.vy = jumpVelocity;
        } else if (gameState === "gameover") {
            resetGame();
        }
    }

    document.addEventListener("keydown", (e) => {
        if (e.code === "Space" || e.code === "ArrowUp") {
            e.preventDefault();
            flap();
        }
    });

    ["click", "touchstart"].forEach(evt => {
        canvas.addEventListener(evt, (e) => {
            e.preventDefault();
            flap();
        });

        overlay.addEventListener(evt, (e) => {
            e.preventDefault();
            flap();
        });

        startBtn.addEventListener(evt, (e) => {
            e.preventDefault();
            flap();
        });
    });

    resetGame();
    loop();
});