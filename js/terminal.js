import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ========== FIREBASE ==========
const firebaseConfig = {
    apiKey: "AIzaSyCLbWp6Fl2covgchvupY5H7leUCmlXFAwE",
    authDomain: "mbha-flappy.firebaseapp.com",
    projectId: "mbha-flappy",
    storageBucket: "mbha-flappy.firebasestorage.app",
    messagingSenderId: "800643993606",
    appId: "1:800643993606:web:571b10108b0122ed383387"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const accessRef = doc(db, "mbha_access", "state");

// ========== DOM ==========
const CODES = { bar: "7", waiters: "7", management: "7" };

const sysStatus = document.getElementById("sysStatus");
const logBox = document.getElementById("log");
const goBtn = document.getElementById("goBtn");
const verifyBtn = document.getElementById("verifyBtn");

const FIELDS = ["bar", "waiters", "management"];

let allDone = false;
let verified = false;
let isVerifying = false;

// ========== AUDIO CORE (Web Audio) ==========
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    return audioCtx;
}

function playBeep(type, freq, duration, volume) {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type || "square";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(volume, ctx.currentTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        osc.start(now);
        gain.gain.linearRampToValueAtTime(0, now + duration);
        osc.stop(now + duration + 0.05);
    } catch (e) {
        // если аудио заблокировано системой - просто игнорируем
        console.warn("Audio error:", e);
    }
}

// dial-up / adsl style
function playDialup() {
    try {
        const ctx = getAudioCtx();
        const now = ctx.currentTime;

        function tone(f1, f2, tStart, tEnd, vol) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "square";
            osc.frequency.setValueAtTime(f1, now + tStart);
            osc.frequency.linearRampToValueAtTime(f2, now + tEnd);
            gain.gain.setValueAtTime(vol, now + tStart);
            gain.gain.linearRampToValueAtTime(0, now + tEnd);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + tStart);
            osc.stop(now + tEnd + 0.05);
        }

        tone(300, 900, 0.0, 0.5, 0.06);
        tone(1000, 1500, 0.5, 1.0, 0.05);
        tone(400, 2000, 1.0, 2.0, 0.04);
    } catch (e) {
        console.warn("Dialup audio error:", e);
    }
}

function playTick() {
    playBeep("triangle", 1400, 0.04, 0.12);
}

function playErrorBeep() {
    try {
        const ctx = getAudioCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.2);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    } catch (e) {
        console.warn("Error beep audio error:", e);
    }
}

function playSuccess() {
    try {
        const ctx = getAudioCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.linearRampToValueAtTime(1100, now + 0.4);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.45);
    } catch (e) {
        console.warn("Success audio error:", e);
    }
}

function playStart() {
    try {
        const ctx = getAudioCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.5);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.55);
    } catch (e) {
        console.warn("Start audio error:", e);
    }
}

function playEaster() {
    try {
        const ctx = getAudioCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(140, now + 0.8);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gain.gain.linearRampToValueAtTime(0, now + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.85);
    } catch (e) {
        console.warn("Easter audio error:", e);
    }
}

// ========== FIRESTORE LOGIC ==========
async function ensureDoc() {
    const snap = await getDoc(accessRef);
    if (!snap.exists()) {
        await setDoc(accessRef, {
            barDone: false,
            waitersDone: false,
            managementDone: false,
            barCode: "",
            waitersCode: "",
            managementCode: ""
        });
    }
}

function refreshButtons() {
    if (allDone && !isVerifying) {
        verifyBtn.classList.add("active");
    } else {
        verifyBtn.classList.remove("active");
    }

    if (allDone && verified) {
        goBtn.classList.add("active");
        goBtn.onclick = function() {
            // звук старта перед переходом
            playStart();
            setTimeout(function() {
                window.location.href = "main.html";
            }, 700);
        };
    } else {
        goBtn.classList.remove("active");
        goBtn.onclick = null;
    }
}

function applyState(data) {
    allDone =
        data.barDone === true &&
        data.waitersDone === true &&
        data.managementDone === true;

    FIELDS.forEach(function(key) {
        const input = document.getElementById(key + "Input");
        const status = document.getElementById(key + "Status");

        if (data[key + "Done"]) {
            input.disabled = true;
            input.value = data[key + "Code"];
            status.textContent = "LOCKED DONE";
            status.className = "status done";
        }
    });

    refreshButtons();
}

function bindInput(key) {
    const input = document.getElementById(key + "Input");
    const status = document.getElementById(key + "Status");

    input.addEventListener("input", async function() {
        // первый юзер-жест - можно безопасно создать audioCtx
        getAudioCtx();

        if (input.value === CODES[key]) {
            input.disabled = true;
            status.textContent = "UPDATING";

            await updateDoc(accessRef, {
                [key + "Done"]: true,
                [key + "Code"]: input.value
            });
        } else {
            status.textContent = "WRONG CODE";
            status.className = "status err";
            playErrorBeep();
            input.value = "";
            setTimeout(function() {
                status.textContent = "WAITING INPUT";
                status.className = "status wait";
            }, 700);
        }
    });
}

function appendLogLine(text) {
    const line = document.createElement("div");
    line.className = "line";
    line.textContent = text;
    logBox.appendChild(line);
    // звук тик на строку
    if (text.indexOf("ACCESS GRANTED") === -1) {
        playTick();
    } else {
        playSuccess();
    }
}

function runVerifyAnimation() {
    if (!allDone) {
        logBox.innerHTML = "";
        appendLogLine("> ERROR: DIVISION CODES INCOMPLETE");
        appendLogLine("> BAR / WAITERS / MANAGEMENT REQUIRED");
        return;
    }
    if (isVerifying) return;

    isVerifying = true;
    verified = false;
    verifyBtn.classList.remove("active");

    logBox.innerHTML = "";
    sysStatus.textContent = "> STATUS: RUNNING CHECK";

    // запуск dial-up звука
    playDialup();

    const baseLines = [
        "> CHECKING DIVISION CODES...",
        "> BAR OK",
        "> WAITERS OK",
        "> MANAGEMENT OK",
        "> LOADING PROFILE HOME_ALONE",
        "> ENABLE CHRISTMAS MODE OK",
        "> SYNC TOTAL SALES OK",
        "> INJECTING CHRISTMAS KERNEL OK",
        "> VALIDATING QR SESSION OK",
        "> OVERRIDE SECURITY PROTOCOL OK",
        "> ACCESS LEVEL ROOT",
        "> VENTILATE THE AIR ON TAKEAWAY OK",
        "> POPI PISI KAKI OK",
        "> POUR PROSECCO OK",
        "> BUY TICKETS FOR THE BARCELONA GAME OK",
        "> ACCESS GRANTED"
    ];

    const lines = baseLines.slice();

    // пасхалка: KEVIN IS WATCHING YOU...
    const isEaster = Math.random() < 0.07;
    if (isEaster) {
        lines.unshift("> KEVIN IS WATCHING YOU...");
    }

    lines.forEach(function(text, index) {
        setTimeout(function() {
            appendLogLine(text);

            if (text.indexOf("KEVIN IS WATCHING YOU") !== -1) {
                playEaster();
            }

            if (index === lines.length - 1) {
                sysStatus.textContent = "> STATUS: READY";
                verified = true;
                isVerifying = false;
                refreshButtons();
            }
        }, 500 * index);
    });
}

// ========== INIT ==========
(async function() {
    try {
        await ensureDoc();
        sysStatus.textContent = "> STATUS: ONLINE";

        onSnapshot(accessRef, function(snap) {
            if (snap.exists()) {
                applyState(snap.data());
            }
        });

        FIELDS.forEach(bindInput);
        verifyBtn.addEventListener("click", function() {
            // гарантируем создание AudioContext по клику
            getAudioCtx();
            runVerifyAnimation();
        });
    } catch (e) {
        sysStatus.textContent = "> STATUS: ERROR";
        console.error(e);
    }
})();