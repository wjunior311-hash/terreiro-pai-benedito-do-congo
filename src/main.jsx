import './appStable.jsx'

// build version: 2026-09-30-22-05
if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register(import.meta.env.BASE_URL+'sw.js?v=202609302205').catch(()=>{}));
