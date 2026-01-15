/* MBHA Service Worker (precache + runtime cache)
   Put this file at: mbhomealone/sw.js  (site root)
*/
const VERSION = "mbha-v1.0.0";
const PRECACHE = `precache-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;

// Edit this list to match your real files.
// Use paths relative to site root (GitHub Pages project root), e.g. "/mbhomealone/..."
const PRECACHE_URLS = [
    // Core pages (adjust if needed)
    "./",
    "./index.html",

    // Results/cards
    "./results/cards.html",
    "./results/css/cards.css",
    "./results/js/cards.js",

    // Common assets (adjust names/paths to yours)
    "./img/avatars/GUEST.png",
    "./results/img/icons/team-bandits.png",
    "./results/img/icons/team-boss.png",
    "./results/img/icons/team-kevin.png",
    "./results/img/final/coin.png",

    // Audio (adjust to your real filenames)
    "./audio/card_shuffle03.mp3",
    "./audio/olenmoneta.mp3",
    "./audio/boxcoins.mp3",
    "./audio/summa.mp3",
    "./audio/shmiak.mp3",
    "./audio/dont-push-guest.mp3",
    "./audio/tiktak.mp3",
    "./audio/bulk.mp3",
    "./audio/watc.mp3",
    "./audio/boxshmyak.mp3",
    "./audio/boxopencoin.mp3",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async() => {
            const cache = await caches.open(PRECACHE);
            // Precache, but don't fail install if one file is missing:
            await Promise.all(
                PRECACHE_URLS.map(async(u) => {
                    try {
                        await cache.add(new Request(u, { cache: "reload" }));
                    } catch (e) {
                        // ignore missing/blocked files so SW still installs
                    }
                })
            );
            self.skipWaiting();
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async() => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                .filter((k) => k.startsWith("precache-") || k.startsWith("runtime-"))
                .filter((k) => k !== PRECACHE && k !== RUNTIME)
                .map((k) => caches.delete(k))
            );
            await self.clients.claim();
        })()
    );
});

// Optional: warmup on-demand from the page (MessageChannel)
async function warmupAll() {
    const cache = await caches.open(PRECACHE);
    await Promise.all(
        PRECACHE_URLS.map(async(u) => {
            try {
                const match = await cache.match(u);
                if (!match) await cache.add(new Request(u, { cache: "reload" }));
            } catch (e) {}
        })
    );
    return true;
}

self.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data && data.type === "WARMUP") {
        event.waitUntil(
            (async() => {
                await warmupAll();
                if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true });
            })()
        );
    }
});

self.addEventListener("fetch", (event) => {
    const req = event.request;

    // Only GET
    if (req.method !== "GET") return;

    const url = new URL(req.url);

    // Only same-origin
    if (url.origin !== self.location.origin) return;

    // Cache-first for precached stuff, then runtime cache
    event.respondWith(
        (async() => {
            const precache = await caches.open(PRECACHE);
            const precached = await precache.match(req, { ignoreSearch: true });
            if (precached) return precached;

            const runtime = await caches.open(RUNTIME);
            const cached = await runtime.match(req);
            if (cached) return cached;

            try {
                const fresh = await fetch(req);
                // Cache successful basic responses
                if (fresh && fresh.status === 200 && fresh.type === "basic") {
                    runtime.put(req, fresh.clone()).catch(() => {});
                }
                return fresh;
            } catch (e) {
                // Offline fallback: try any cached version ignoring search
                const fallback = await runtime.match(req, { ignoreSearch: true });
                if (fallback) return fallback;
                throw e;
            }
        })()
    );
});