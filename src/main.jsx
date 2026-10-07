import "./App.jsx";

// build version: 2026-10-07
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js?v=202610072100").catch(() => {}));
