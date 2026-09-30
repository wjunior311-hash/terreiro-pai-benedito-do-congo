import './appStable.jsx'

// build version: 2026-09-30-21-45
if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js?v=202609211124').catch(()=>{}));
