import './appStable.jsx'

// build version: 2026-09-30-08-55
if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js?v=202609300855').catch(()=>{}));
