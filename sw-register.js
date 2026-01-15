/* MBHA SW register + "preload then reveal" helper
   Put this file where you like, e.g.: mbhomealone/results/js/sw-register.js
   Then include it in cards.html (and/or other pages).
*/
(async() => {
    if (!("serviceWorker" in navigator)) return;

    try {
        // From /results/cards.html use "../sw.js"
        // From root pages use "./sw.js"
        const swUrl = "../sw.js";

        // Optional: show a loading overlay while we warmup cache
        const loader = document.createElement("div");
        loader.id = "mbha-preload";
        loader.style.cssText = [
            "position:fixed;inset:0;z-index:99999;",
            "display:flex;align-items:center;justify-content:center;",
            "background:rgba(0,0,0,0.86);color:#fff;",
            "font-family:Pixelify Sans, system-ui, sans-serif;",
            "font-size:18px;letter-spacing:0.5px;",
        ].join("");
        loader.textContent = "Завантажую ресурси…";
        document.documentElement.appendChild(loader);

        const reg = await navigator.serviceWorker.register(swUrl);

        // Wait until SW is ready (controlling or active)
        await navigator.serviceWorker.ready;

        // Ask SW to warmup all precache URLs (ensures audio/images pulled)
        const warmOk = await new Promise((resolve) => {
            const ch = new MessageChannel();
            ch.port1.onmessage = (e) => resolve(!!(e.data && e.data.ok));
            if (reg.active) reg.active.postMessage({ type: "WARMUP" }, [ch.port2]);
            else resolve(false);
            // Safety timeout
            setTimeout(() => resolve(false), 6000);
        });

        // Remove loader regardless (even if warmup failed)
        loader.remove();

        // NOTE: First visit still needs network for the HTML itself.
        // After this, most assets will be cached for fast/consistent playback.
        void warmOk;
    } catch (e) {
        const el = document.getElementById("mbha-preload");
        if (el) el.remove();
    }
})();