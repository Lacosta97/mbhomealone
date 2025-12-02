import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const CODES = {
    bar: "7",
    waiters: "7",
    management: "7"
};

const sysStatus = document.getElementById("sysStatus");
const logBox = document.getElementById("log");
const goBtn = document.getElementById("goBtn");
const verifyBtn = document.getElementById("verifyBtn");

const FIELDS = ["bar", "waiters", "management"];

let allDone = false;
let verified = false;
let isVerifying = false;

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
            window.location.href = "main.html";
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

    const lines = [
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

    lines.forEach(function(text, index) {
        setTimeout(function() {
            appendLogLine(text);
            if (index === lines.length - 1) {
                sysStatus.textContent = "> STATUS: READY";
                verified = true;
                isVerifying = false;
                refreshButtons();
            }
        }, 500 * index);
    });
}

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
        verifyBtn.addEventListener("click", runVerifyAnimation);
    } catch (e) {
        sysStatus.textContent = "> STATUS: ERROR";
        console.error(e);
    }
})();