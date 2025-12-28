// ===== NYE (Kyiv time) — heart overlay FIX v3 (MBHA compatible, FIXED) =====
// Shows between 2025-12-31 00:00 and 2026-01-01 23:59 (Europe/Kyiv)
// Debug: add ?nye=1 to force show

(function () {
  const tz = "Europe/Kyiv";

  const widget = document.getElementById("nyeWidget");
  const envelopeBtn = document.getElementById("nyeEnvelopeBtn");

  const modal = document.getElementById("nyeLetter");
  const modalClose = document.getElementById("nyeLetterCloseBtn");
  const modalBackdrop = document.getElementById("nyeLetterBackdrop");

  const heartBtn = document.getElementById("nyeHeartBtn");

  if (!widget || !envelopeBtn || !modal || !modalClose || !modalBackdrop || !heartBtn) return;

  // ===== Garland title =====
  const titleEl = widget.querySelector(".nye-title");
  if (titleEl && !titleEl.dataset.garlandReady) {
    const raw = titleEl.textContent || "";
    const colors = ["#ff3b30", "#ff9500", "#ffd60a", "#34c759", "#0a84ff", "#bf5af2", "#ff2d55"];
    titleEl.textContent = "";
    let idx = 0;

    for (const ch of raw) {
      const span = document.createElement("span");
      span.className = "nye-ch";
      span.textContent = ch;

      if (ch === " ") {
        span.style.width = "14px";
        span.style.animation = "none";
        span.style.filter = "none";
        span.style.opacity = "1";
        span.style.color = "inherit";
      } else {
        const c = colors[idx % colors.length];
        const d = (idx * 120) % 960;
        span.style.setProperty("--c", c);
        span.style.setProperty("--d", `${d}ms`);
        idx++;
      }
      titleEl.appendChild(span);
    }
    titleEl.dataset.garlandReady = "1";
  }

  // Heart emoji
  heartBtn.textContent = "❤️";

  // ===== Time window (Kyiv) =====
  function kyivNowParts() {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = fmt.formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value || "00";

    return {
      y: +get("year"),
      mo: +get("month"),
      d: +get("day"),
      h: +get("hour"),
      mi: +get("minute"),
      s: +get("second"),
    };
  }

  function kyivStamp(p) {
    const pad2 = (n) => String(n).padStart(2, "0");
    return +(
      String(p.y) +
      pad2(p.mo) +
      pad2(p.d) +
      pad2(p.h) +
      pad2(p.mi) +
      pad2(p.s)
    );
  }

  const startStamp = 20251231000000;
  const endStamp = 20260101235959;

  function shouldShow() {
    const url = new URL(window.location.href);
    if (url.searchParams.get("nye") === "1") return true;
    const now = kyivStamp(kyivNowParts());
    return now >= startStamp && now <= endStamp;
  }

  function setWidgetVisible(on) {
    widget.setAttribute("aria-hidden", on ? "false" : "true");
    widget.style.display = on ? "" : "none";
    envelopeBtn.style.display = on ? "" : "none";
  }

  // ===== Modal =====
  function openModal() {
    modal.setAttribute("aria-hidden", "false");
    modal.style.display = "";
  }

  function closeModal() {
    modal.setAttribute("aria-hidden", "true");
    modal.style.display = "none";
  }

  envelopeBtn.addEventListener("click", openModal);
  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // ===== HEART CLICK (uses dontPushOverlay logic) =====
  heartBtn.addEventListener("click", () => {
    const overlay = document.getElementById("dontPushOverlay");
    if (!overlay) return;

    const okakPath = "img/icons/okak2.png";
    const soundPath = "audio/dont-push-guest.mp3";

    const img = overlay.querySelector("img");
    const prevImgSrc = img ? img.getAttribute("src") : null;

    const prevBg = overlay.style.backgroundImage;
    const prevBgSize = overlay.style.backgroundSize;
    const prevBgPos = overlay.style.backgroundPosition;
    const prevBgRepeat = overlay.style.backgroundRepeat;

    if (img) {
      img.setAttribute("src", okakPath);
    } else {
      overlay.style.backgroundImage = `url("${okakPath}")`;
      overlay.style.backgroundSize = "contain";
      overlay.style.backgroundPosition = "center";
      overlay.style.backgroundRepeat = "no-repeat";
    }

    overlay.classList.add("is-visible");

    try {
      const a = new Audio(soundPath);
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch (_) {}

    setTimeout(() => {
      overlay.classList.remove("is-visible");

      if (img) {
        if (prevImgSrc) img.setAttribute("src", prevImgSrc);
      } else {
        overlay.style.backgroundImage = prevBg || "";
        overlay.style.backgroundSize = prevBgSize || "";
        overlay.style.backgroundPosition = prevBgPos || "";
        overlay.style.backgroundRepeat = prevBgRepeat || "";
      }
    }, 1000);
  });

  // ===== Init =====
  setWidgetVisible(shouldShow());
  setInterval(() => setWidgetVisible(shouldShow()), 30000);
})();
