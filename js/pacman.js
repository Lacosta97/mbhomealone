// MBHA · PAC-MAN ARCADE
(function() {
    document.addEventListener("DOMContentLoaded", initPacman);

    function initPacman() {
        const arcadeModal = document.getElementById("arcadeModal");
        const arcadeBackdrop = document.getElementById("arcadeBackdrop");
        const arcadeBtn = document.getElementById("arcadeBtn");
        const arcadeCloseBtn = document.getElementById("arcadeCloseBtn");

        const scoreEl = document.getElementById("arcadeScore");
        const livesEl = document.getElementById("arcadeLives");
        const levelEl = document.getElementById("arcadeWave");
        const finalScoreEl = document.getElementById("arcadeFinalScore");

        const startBtn = document.getElementById("pacmanStartBtn");
        const pauseBtn = document.getElementById("pacmanPauseBtn");
        const restartBtn = document.getElementById("arcadeRestartBtn");
        const muteBtn = document.getElementById("arcadeMuteBtn");
        const gameOverRestartBtn = document.getElementById("arcadeGameOverRestartBtn");

        const startBtnMobile = document.getElementById("pacmanStartBtnMobile");
        const pauseBtnMobile = document.getElementById("pacmanPauseBtnMobile");

        const btnUp = document.getElementById("pacmanBtnUp");
        const btnDown = document.getElementById("pacmanBtnDown");
        const btnLeft = document.getElementById("pacmanBtnLeft");
        const btnRight = document.getElementById("pacmanBtnRight");

        const startOverlay = document.getElementById("pacmanStartScreen");
        const gameOverOverlay = document.getElementById("pacmanGameOverScreen");
        const rotateOverlay = document.getElementById("pacmanRotateOverlay");

        const canvas = document.getElementById("pacmanCanvas");
        if (!canvas || !arcadeModal) return;

        const ctx = canvas.getContext("2d");

        // ---------------- CONFIG ----------------

        const TILE = 8;

        // Простая карта-лабиринт 28x21
        const MAZE_TEMPLATE = [
            "############################",
            "#............##............#",
            "#.####.#####.##.#####.####.#",
            "#o####.#####.##.#####.####o#",
            "#.####.#####.##.#####.####.#",
            "#..........................#",
            "#.####.##.########.##.####.#",
            "#.####.##.########.##.####.#",
            "#......##....##....##......#",
            "######.##### ## #####.######",
            "     #.##### ## #####.#     ",
            "######.##          ##.######",
            "       .# ######## #.       ",
            "######.## ######## ##.######",
            "######.##          ##.######",
            "#............##............#",
            "#.####.#####.##.#####.####.#",
            "#o..##................##..o#",
            "###.##.##.########.##.##.###",
            "#......##....##....##......#",
            "############################"
        ];

        const ROWS = MAZE_TEMPLATE.length;
        const COLS = MAZE_TEMPLATE[0].length;

        canvas.width = COLS * TILE;
        canvas.height = ROWS * TILE;

        // Звуки — добавишь свои файлы в папку audio/
        const sounds = {
            start: new Audio("audio/pacman_start.mp3"),
            chomp: new Audio("audio/pacman_chomp.mp3"),
            power: new Audio("audio/pacman_power.mp3"),
            eatGhost: new Audio("audio/pacman_eat_ghost.mp3"),
            death: new Audio("audio/pacman_death.mp3"),
            gameOver: new Audio("audio/pacman_game_over.mp3")
        };

        let mute = false;

        function playSound(name, volume = 1.0) {
            if (mute) return;
            const base = sounds[name];
            if (!base) return;
            try {
                const a = base.cloneNode();
                a.volume = volume;
                a.play().catch(() => {});
            } catch (e) {}
        }

        // Спрайтшит (пока можно не использовать, рисуем примитивы)
        const spriteSheet = new Image();
        spriteSheet.src = "img/pacman/pacman-spritesheet.png";

        // ---------------- GAME STATE ----------------

        const GAME = {
            score: 0,
            lives: 3,
            level: 1,
            running: false,
            paused: false,
            gameOver: false,
            frightened: false,
            frightenedTimer: 0,
            pelletsLeft: 0,
            lastTime: 0,
            reqId: null,
            maze: [],
            keys: {
                up: false,
                down: false,
                left: false,
                right: false
            }
        };

        const pacman = {
            x: 0,
            y: 0,
            dirX: 0,
            dirY: 0,
            nextDirX: 0,
            nextDirY: 0,
            speed: 60, // px/s
            radius: TILE * 0.9 / 2
        };

        const ghosts = [];

        function clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        }

        function copyMazeTemplate() {
            const arr = [];
            let pellets = 0;
            for (let r = 0; r < ROWS; r++) {
                const rowStr = MAZE_TEMPLATE[r];
                const row = rowStr.split("");
                for (let c = 0; c < COLS; c++) {
                    if (row[c] === ".") pellets++;
                    if (row[c] === "o") pellets++;
                }
                arr.push(row);
            }
            GAME.pelletsLeft = pellets;
            return arr;
        }

        function tileAt(col, row) {
            if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return "#";
            return GAME.maze[row][col];
        }

        function isWall(col, row) {
            const ch = tileAt(col, row);
            return ch === "#" || ch === " ";
        }

        function isIntersection(x, y) {
            const col = Math.round(x / TILE);
            const row = Math.round(y / TILE);
            const up = !isWall(col, row - 1);
            const down = !isWall(col, row + 1);
            const left = !isWall(col - 1, row);
            const right = !isWall(col + 1, row);
            let count = 0;
            if (up) count++;
            if (down) count++;
            if (left) count++;
            if (right) count++;
            return count > 2;
        }

        function resetPositions() {
            // Pac-Man старт — центр карты снизу
            pacman.x = 13.5 * TILE;
            pacman.y = 15 * TILE;
            pacman.dirX = 0;
            pacman.dirY = 0;
            pacman.nextDirX = 0;
            pacman.nextDirY = 0;

            ghosts.length = 0;

            // 4 привида вокруг центра карты
            const baseY = 9 * TILE;
            ghosts.push(makeGhost(11.5 * TILE, baseY, "red"));
            ghosts.push(makeGhost(13.5 * TILE, baseY, "pink"));
            ghosts.push(makeGhost(15.5 * TILE, baseY, "cyan"));
            ghosts.push(makeGhost(13.5 * TILE, baseY + 2 * TILE, "orange"));
        }

        function makeGhost(x, y, colorName) {
            return {
                x,
                y,
                dirX: 0,
                dirY: 0,
                speed: 50,
                color: colorName,
                dead: false
            };
        }

        function resetGame(fullReset = true) {
            GAME.maze = copyMazeTemplate();
            GAME.score = fullReset ? 0 : GAME.score;
            GAME.lives = fullReset ? 3 : GAME.lives;
            GAME.level = fullReset ? 1 : GAME.level;
            GAME.frightened = false;
            GAME.frightenedTimer = 0;
            GAME.running = false;
            GAME.paused = false;
            GAME.gameOver = false;
            GAME.lastTime = performance.now();

            resetPositions();
            updateHUD();
            showStartOverlay();
            hideGameOverOverlay();
            clearCanvas();
            drawScene();
        }

        function updateHUD() {
            if (scoreEl) scoreEl.textContent = GAME.score.toString().padStart(4, "0");
            if (livesEl) livesEl.textContent = GAME.lives.toString();
            if (levelEl) levelEl.textContent = GAME.level.toString();
        }

        function clearCanvas() {
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        function showStartOverlay() {
            if (startOverlay) startOverlay.style.display = "flex";
        }

        function hideStartOverlay() {
            if (startOverlay) startOverlay.style.display = "none";
        }

        function showGameOverOverlay() {
            if (gameOverOverlay) gameOverOverlay.style.display = "flex";
            if (finalScoreEl) finalScoreEl.textContent = GAME.score.toString().padStart(4, "0");
        }

        function hideGameOverOverlay() {
            if (gameOverOverlay) gameOverOverlay.style.display = "none";
        }

        // ---------------- DRAW ----------------

        function drawScene() {
            clearCanvas();
            drawMaze();
            drawPellets();
            drawPacman();
            drawGhosts();
        }

        function drawMaze() {
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const ch = GAME.maze[r][c];
                    if (ch === "#") {
                        ctx.fillStyle = "#0f172a";
                        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
                        ctx.strokeStyle = "#1e293b";
                        ctx.strokeRect(c * TILE + 1, r * TILE + 1, TILE - 2, TILE - 2);
                    }
                }
            }
        }

        function drawPellets() {
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const ch = GAME.maze[r][c];
                    if (ch === ".") {
                        ctx.fillStyle = "#facc15";
                        const cx = c * TILE + TILE / 2;
                        const cy = r * TILE + TILE / 2;
                        ctx.beginPath();
                        ctx.arc(cx, cy, TILE * 0.15, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (ch === "o") {
                        ctx.fillStyle = "#f97316";
                        const cx = c * TILE + TILE / 2;
                        const cy = r * TILE + TILE / 2;
                        ctx.beginPath();
                        ctx.arc(cx, cy, TILE * 0.3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        function drawPacman() {
            const radius = pacman.radius;
            const mouthAngle = Math.PI / 6;
            let angleOffset = 0;

            if (pacman.dirX === 1) angleOffset = 0;
            else if (pacman.dirX === -1) angleOffset = Math.PI;
            else if (pacman.dirY === -1) angleOffset = -Math.PI / 2;
            else if (pacman.dirY === 1) angleOffset = Math.PI / 2;

            ctx.fillStyle = "#facc15";
            ctx.beginPath();
            ctx.moveTo(pacman.x, pacman.y);
            ctx.arc(
                pacman.x,
                pacman.y,
                radius,
                angleOffset + mouthAngle,
                angleOffset + Math.PI * 2 - mouthAngle
            );
            ctx.closePath();
            ctx.fill();
        }

        function drawGhosts() {
            ghosts.forEach(g => {
                if (g.dead) {
                    // маленькие глаза
                    ctx.fillStyle = "#e5e7eb";
                    ctx.fillRect(g.x - TILE * 0.5, g.y - TILE * 0.5, TILE, TILE * 0.6);
                    ctx.fillStyle = "#1f2937";
                    ctx.fillRect(g.x - 2, g.y - 2, 2, 2);
                    ctx.fillRect(g.x + 0, g.y - 2, 2, 2);
                    return;
                }

                let bodyColor = "#ef4444";
                if (GAME.frightened) {
                    bodyColor = "#3b82f6";
                } else {
                    if (g.color === "pink") bodyColor = "#ec4899";
                    else if (g.color === "cyan") bodyColor = "#22d3ee";
                    else if (g.color === "orange") bodyColor = "#f97316";
                }

                const x = g.x;
                const y = g.y;
                const w = TILE;
                const h = TILE;

                ctx.fillStyle = bodyColor;
                ctx.beginPath();
                ctx.arc(x, y - h * 0.1, w * 0.5, Math.PI, 0);
                ctx.rect(x - w * 0.5, y - h * 0.1, w, h * 0.6);
                ctx.fill();

                ctx.fillStyle = "#e5e7eb";
                ctx.beginPath();
                ctx.arc(x - 3, y - 2, 2, 0, Math.PI * 2);
                ctx.arc(x + 3, y - 2, 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = "#1f2937";
                ctx.beginPath();
                ctx.arc(x - 3, y - 2, 1, 0, Math.PI * 2);
                ctx.arc(x + 3, y - 2, 1, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // ---------------- UPDATE ----------------

        function update(dt) {
            if (!GAME.running || GAME.paused || GAME.gameOver) return;

            // frightened timer
            if (GAME.frightened) {
                GAME.frightenedTimer -= dt;
                if (GAME.frightenedTimer <= 0) {
                    GAME.frightened = false;
                }
            }

            updatePacman(dt);
            updateGhosts(dt);
            checkCollisions();
            if (GAME.pelletsLeft <= 0) {
                // следующий уровень
                GAME.level++;
                GAME.maze = copyMazeTemplate();
                resetPositions();
                playSound("start", 0.8);
            }
        }

        function tileCoordsFromPosition(x, y) {
            const col = Math.floor(x / TILE);
            const row = Math.floor(y / TILE);
            return { col, row };
        }

        function canMoveTo(x, y, dirX, dirY) {
            const radius = pacman.radius * 0.9;
            const newX = x + dirX * radius;
            const newY = y + dirY * radius;
            const left = newX - radius;
            const right = newX + radius;
            const top = newY - radius;
            const bottom = newY + radius;

            const leftCol = Math.floor(left / TILE);
            const rightCol = Math.floor(right / TILE);
            const topRow = Math.floor(top / TILE);
            const bottomRow = Math.floor(bottom / TILE);

            for (let r = topRow; r <= bottomRow; r++) {
                for (let c = leftCol; c <= rightCol; c++) {
                    if (isWall(c, r)) return false;
                }
            }
            return true;
        }

        function updatePacman(dt) {
            // попытка повернуть в желаемое направление
            if (GAME.keys.up) {
                pacman.nextDirX = 0;
                pacman.nextDirY = -1;
            } else if (GAME.keys.down) {
                pacman.nextDirX = 0;
                pacman.nextDirY = 1;
            } else if (GAME.keys.left) {
                pacman.nextDirX = -1;
                pacman.nextDirY = 0;
            } else if (GAME.keys.right) {
                pacman.nextDirX = 1;
                pacman.nextDirY = 0;
            }

            const speed = pacman.speed;
            const move = speed * dt;

            // поворачиваем, если можно
            if (
                (pacman.nextDirX !== pacman.dirX || pacman.nextDirY !== pacman.dirY) &&
                canMoveTo(pacman.x, pacman.y, pacman.nextDirX, pacman.nextDirY)
            ) {
                pacman.dirX = pacman.nextDirX;
                pacman.dirY = pacman.nextDirY;
            }

            // движемся вперёд, если путь свободен
            const newX = pacman.x + pacman.dirX * move;
            const newY = pacman.y + pacman.dirY * move;

            if (canMoveTo(newX, newY, pacman.dirX, pacman.dirY)) {
                pacman.x = newX;
                pacman.y = newY;
            }

            // тоннели по бокам (wrap)
            if (pacman.x < -TILE) pacman.x = canvas.width + TILE;
            if (pacman.x > canvas.width + TILE) pacman.x = -TILE;

            // еда
            const { col, row } = tileCoordsFromPosition(pacman.x, pacman.y);
            const ch = tileAt(col, row);
            if (ch === "." || ch === "o") {
                GAME.maze[row][col] = " ";
                GAME.pelletsLeft--;
                if (ch === ".") {
                    GAME.score += 10;
                    playSound("chomp", 0.4);
                } else {
                    GAME.score += 50;
                    GAME.frightened = true;
                    GAME.frightenedTimer = 6; // сек
                    playSound("power", 0.6);
                }
                updateHUD();
            }
        }

        function updateGhosts(dt) {
            ghosts.forEach(g => {
                const speed = GAME.frightened ? g.speed * 0.6 : g.speed;
                const move = speed * dt;

                // случайная смена направления на развилках
                if (isIntersection(g.x, g.y) || (g.dirX === 0 && g.dirY === 0)) {
                    const dirs = [
                        { x: 1, y: 0 },
                        { x: -1, y: 0 },
                        { x: 0, y: 1 },
                        { x: 0, y: -1 }
                    ];

                    const possibles = dirs.filter(d => {
                        // не разворачиваться на 180°
                        if (d.x === -g.dirX && d.y === -g.dirY) return false;
                        return canMoveTo(g.x, g.y, d.x, d.y);
                    });

                    if (possibles.length > 0) {
                        const choice = possibles[Math.floor(Math.random() * possibles.length)];
                        g.dirX = choice.x;
                        g.dirY = choice.y;
                    }
                }

                const newX = g.x + g.dirX * move;
                const newY = g.y + g.dirY * move;

                if (canMoveTo(newX, newY, g.dirX, g.dirY)) {
                    g.x = newX;
                    g.y = newY;
                } else {
                    // упёрся — попробуем выбрать новое направление
                    g.dirX = 0;
                    g.dirY = 0;
                }

                // тоннели
                if (g.x < -TILE) g.x = canvas.width + TILE;
                if (g.x > canvas.width + TILE) g.x = -TILE;
            });
        }

        function distance(a, b) {
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            return Math.sqrt(dx * dx + dy * dy);
        }

        function checkCollisions() {
            ghosts.forEach(g => {
                if (g.dead) return;
                const d = distance(pacman, g);
                if (d < TILE * 0.7) {
                    if (GAME.frightened) {
                        // съели привида
                        g.dead = true;
                        GAME.score += 200;
                        playSound("eatGhost", 0.7);
                        updateHUD();
                    } else {
                        // смерть Пакмана
                        loseLife();
                    }
                }
            });
        }

        function loseLife() {
            if (GAME.gameOver) return;
            GAME.lives--;
            updateHUD();
            playSound("death", 0.8);

            if (GAME.lives <= 0) {
                GAME.lives = 0;
                GAME.running = false;
                GAME.gameOver = true;
                showGameOverOverlay();
                playSound("gameOver", 0.9);
            } else {
                GAME.running = false;
                GAME.frightened = false;
                GAME.frightenedTimer = 0;
                resetPositions();
                showStartOverlay();
            }
        }

        // ---------------- LOOP ----------------

        function loop(timestamp) {
            if (!arcadeModal.classList.contains("is-open")) {
                GAME.reqId = null;
                return;
            }

            if (shouldShowRotateOverlay()) {
                if (rotateOverlay) rotateOverlay.classList.add("is-visible");
            } else {
                if (rotateOverlay) rotateOverlay.classList.remove("is-visible");
            }

            if (!GAME.lastTime) GAME.lastTime = timestamp;
            const dt = (timestamp - GAME.lastTime) / 1000;
            GAME.lastTime = timestamp;

            update(dt);
            drawScene();

            GAME.reqId = requestAnimationFrame(loop);
        }

        // ---------------- ORIENTATION ----------------

        function isPortrait() {
            return window.innerHeight > window.innerWidth;
        }

        function shouldShowRotateOverlay() {
            const mobile = window.innerWidth <= 768;
            return mobile && isPortrait() && arcadeModal.classList.contains("is-open");
        }

        window.addEventListener("resize", () => {
            if (rotateOverlay) {
                if (shouldShowRotateOverlay()) {
                    rotateOverlay.classList.add("is-visible");
                } else {
                    rotateOverlay.classList.remove("is-visible");
                }
            }
        });

        // ---------------- CONTROL ----------------

        function setKey(dir, value) {
            if (dir === "up") GAME.keys.up = value;
            if (dir === "down") GAME.keys.down = value;
            if (dir === "left") GAME.keys.left = value;
            if (dir === "right") GAME.keys.right = value;
        }

        function bindDpadButton(btn, dir) {
            if (!btn) return;
            const handlerDown = (e) => {
                e.preventDefault();
                setKey(dir, true);
            };
            const handlerUp = (e) => {
                e.preventDefault();
                setKey(dir, false);
            };

            btn.addEventListener("mousedown", handlerDown);
            btn.addEventListener("mouseup", handlerUp);
            btn.addEventListener("mouseleave", handlerUp);
            btn.addEventListener("touchstart", handlerDown, { passive: false });
            btn.addEventListener("touchend", handlerUp);
            btn.addEventListener("touchcancel", handlerUp);
        }

        bindDpadButton(btnUp, "up");
        bindDpadButton(btnDown, "down");
        bindDpadButton(btnLeft, "left");
        bindDpadButton(btnRight, "right");

        function startGame() {
            if (GAME.gameOver) {
                resetGame(false);
            }
            GAME.running = true;
            GAME.paused = false;
            GAME.gameOver = false;
            GAME.lastTime = performance.now();
            hideStartOverlay();
            hideGameOverOverlay();
            playSound("start", 0.7);
        }

        function pauseGame(toggle = true) {
            if (!GAME.running) return;
            if (toggle) {
                GAME.paused = !GAME.paused;
            } else {
                GAME.paused = true;
            }
        }

        function openArcade() {
            arcadeModal.classList.add("is-open");
            document.body.style.overflow = "hidden";
            if (!GAME.reqId) {
                GAME.lastTime = performance.now();
                GAME.reqId = requestAnimationFrame(loop);
            }
            if (shouldShowRotateOverlay() && rotateOverlay) {
                rotateOverlay.classList.add("is-visible");
            }
        }

        function closeArcade() {
            arcadeModal.classList.remove("is-open");
            document.body.style.overflow = "";
            GAME.running = false;
            GAME.paused = false;
            if (GAME.reqId) {
                cancelAnimationFrame(GAME.reqId);
                GAME.reqId = null;
            }
        }

        // ---------------- EVENTS ----------------

        if (arcadeBtn) {
            arcadeBtn.addEventListener("click", () => {
                openArcade();
                // при первом открытии — сброс игры
                resetGame(true);
            });
        }

        if (arcadeCloseBtn) {
            arcadeCloseBtn.addEventListener("click", () => {
                closeArcade();
            });
        }

        if (arcadeBackdrop) {
            arcadeBackdrop.addEventListener("click", () => {
                closeArcade();
            });
        }

        if (startBtn) startBtn.addEventListener("click", startGame);
        if (startBtnMobile) startBtnMobile.addEventListener("click", startGame);

        if (pauseBtn) pauseBtn.addEventListener("click", () => pauseGame(true));
        if (pauseBtnMobile) pauseBtnMobile.addEventListener("click", () => pauseGame(true));

        if (restartBtn) {
            restartBtn.addEventListener("click", () => {
                resetGame(true);
            });
        }

        if (gameOverRestartBtn) {
            gameOverRestartBtn.addEventListener("click", () => {
                resetGame(true);
                startGame();
            });
        }

        if (muteBtn) {
            muteBtn.addEventListener("click", () => {
                mute = !mute;
                muteBtn.textContent = mute ? "UNMUTE" : "MUTE";
            });
        }

        function isTypingTarget(target) {
            if (!target) return false;
            const tag = target.tagName;
            return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
        }

        document.addEventListener("keydown", (e) => {
            if (!arcadeModal.classList.contains("is-open")) return;
            if (isTypingTarget(e.target)) return;

            if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
                setKey("up", true);
                e.preventDefault();
            }
            if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
                setKey("down", true);
                e.preventDefault();
            }
            if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
                setKey("left", true);
                e.preventDefault();
            }
            if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
                setKey("right", true);
                e.preventDefault();
            }

            if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                if (!GAME.running && !GAME.gameOver) {
                    startGame();
                } else if (GAME.gameOver) {
                    resetGame(true);
                    startGame();
                }
            }

            if (e.key === "p" || e.key === "P") {
                e.preventDefault();
                pauseGame(true);
            }

            if (e.key === "Escape") {
                e.preventDefault();
                closeArcade();
            }
        });

        document.addEventListener("keyup", (e) => {
            if (!arcadeModal.classList.contains("is-open")) return;
            if (isTypingTarget(e.target)) return;

            if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
                setKey("up", false);
                e.preventDefault();
            }
            if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
                setKey("down", false);
                e.preventDefault();
            }
            if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
                setKey("left", false);
                e.preventDefault();
            }
            if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
                setKey("right", false);
                e.preventDefault();
            }
        });

        // Стартовое состояние
        resetGame(true);
    }
})();