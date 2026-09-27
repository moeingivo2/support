<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#121010">
    <link rel="icon" href="{{ asset('favicon.ico') }}" sizes="any">
    <link rel="icon" type="image/png" href="{{ asset('images/logo.png') }}">
    <link rel="apple-touch-icon" href="{{ asset('images/apple-touch-icon.png') }}">
    <title>{{ config('app.name', 'AIO') }}</title>
    <style>
        :root { color-scheme: dark; --ink: #121010; --blue: #0062ff; --gold: #f2a93a; }
        * { box-sizing: border-box; }
        html, body { min-height: 100%; margin: 0; }
        body { background: var(--ink); color: #f4f4f5; font-family: Tahoma, "Segoe UI", sans-serif; overflow: hidden; }
        .site-shell { min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at 100% -20%, rgba(0,98,255,.2), transparent 28%), radial-gradient(circle at 0% 100%, rgba(242,169,58,.1), transparent 30%), var(--ink); opacity: .5; }
        .site-shell__label { letter-spacing: .24em; font-size: .72rem; color: #52525b; }
        .splash { position: fixed; z-index: 50; inset: 0; isolation: isolate; display: grid; place-items: center; overflow: hidden; padding: 16px; background: var(--ink); transition: clip-path 1.1s cubic-bezier(.76,0,.24,1), visibility 0s 1.1s; }
        .splash::before, .splash::after { content: ""; position: absolute; width: 58vmax; aspect-ratio: 1; border-radius: 50%; filter: blur(30px); opacity: .5; pointer-events: none; }
        .splash::before { top: -32vmax; right: -23vmax; background: radial-gradient(circle, rgba(0,98,255,.4) 0, transparent 66%); animation: drift 10s ease-in-out infinite alternate; }
        .splash::after { bottom: -38vmax; left: -25vmax; background: radial-gradient(circle, rgba(242,169,58,.2) 0, transparent 63%); animation: drift 13s -4s ease-in-out infinite alternate-reverse; }
        .splash.is-leaving { clip-path: circle(0% at 50% 50%); visibility: hidden; }
        .grain { position: absolute; inset: 0; z-index: -1; background-image: linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px); background-size: 42px 42px; mask-image: radial-gradient(ellipse at center, black, transparent 76%); animation: grid 14s linear infinite; pointer-events: none; }
        .splash__content { position: relative; width: min(92vw, 452px); display: grid; justify-items: center; text-align: center; padding: clamp(26px, 6vw, 40px) clamp(18px, 5vw, 34px); overflow: hidden; border: 1px solid rgba(255,255,255,.09); border-radius: 34px; background: linear-gradient(135deg, rgba(255,255,255,.055), rgba(255,255,255,.018)); box-shadow: 0 18px 45px -30px rgba(0,0,0,.95), 0 0 70px -45px rgba(0,98,255,.9); backdrop-filter: blur(18px); animation: glass .8s .05s cubic-bezier(.16,1,.3,1) both; }
        .splash__content::before { content: ""; position: absolute; inset-inline: 12%; top: 0; height: 1px; background: linear-gradient(to left, transparent, rgba(255,255,255,.32), transparent); }
        .eyebrow { margin: 0 0 22px; color: #71717a; font-size: clamp(.6rem, 1.5vw, .72rem); letter-spacing: .32em; font-weight: 700; opacity: 0; animation: rise .7s .12s forwards; }
        .mark { position: relative; width: clamp(140px, 32vw, 190px); aspect-ratio: 1; display: grid; place-items: center; padding: 0; border: 0; background: none; cursor: pointer; touch-action: manipulation; outline: none; opacity: 0; animation: mark-in 1s .25s cubic-bezier(.16,1,.3,1) forwards; }
        .mark:focus-visible { border-radius: 34px; outline: 2px solid rgba(0,98,255,.8); outline-offset: 10px; }
        .mark__orbit, .mark__orbit::before, .mark__orbit::after { position: absolute; border-radius: 50%; border: 1px solid rgba(0,98,255,.32); }
        .mark__orbit { inset: -13%; animation: spin 7s linear infinite; }
        .mark__orbit::before, .mark__orbit::after { content: ""; width: 7px; aspect-ratio: 1; top: -4px; left: 50%; transform: translateX(-50%); background: var(--blue); border: 0; box-shadow: 0 0 18px 5px rgba(0,98,255,.55); }
        .mark__orbit::after { top: auto; bottom: -4px; background: var(--gold); box-shadow: 0 0 16px 5px rgba(242,169,58,.45); }
        .mark__orbit--two { inset: -4%; border-style: dashed; border-color: rgba(242,169,58,.26); opacity: .8; animation-direction: reverse; animation-duration: 5s; }
        .mark__orbit--two::before, .mark__orbit--two::after { width: 5px; }
        .mark__core { position: relative; width: 78%; aspect-ratio: 1; display: grid; place-items: center; overflow: hidden; border: 1px solid rgba(255,255,255,.1); border-radius: 31%; background: linear-gradient(140deg, rgba(255,255,255,.09), rgba(255,255,255,.02)); box-shadow: 0 18px 40px -26px rgba(0,0,0,.95), 0 0 30px -14px rgba(0,98,255,.7); transition: transform .45s cubic-bezier(.34,1.56,.64,1), box-shadow .45s, border-color .45s; }
        .mark__core::before { content: ""; position: absolute; inset: -40%; background: linear-gradient(110deg, transparent 38%, rgba(255,255,255,.28) 50%, transparent 62%); transform: translateX(-75%) rotate(20deg); animation: sheen 4.5s 1.2s ease-in-out infinite; }
        .mark__image { width: 84%; height: 84%; object-fit: contain; filter: drop-shadow(0 10px 22px rgba(0,0,0,.55)); }
        .mark:hover .mark__core, .mark:focus .mark__core { transform: scale(1.06); border-color: rgba(0,98,255,.45); box-shadow: 0 22px 50px -26px rgba(0,0,0,.95), 0 0 46px -12px rgba(0,98,255,.85); }
        .mark.is-pressed .mark__core { transform: scale(.94); }
        .brand { margin: 28px 0 6px; font-size: clamp(1.8rem, 6vw, 2.4rem); line-height: 1; font-weight: 800; letter-spacing: -.03em; opacity: 0; animation: rise .8s .62s forwards; }
        .brand em { font-style: normal; background: linear-gradient(135deg, #0062ff, #7ab4ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .status { min-height: 1.5em; margin: 0; color: #a1a1aa; font-size: .8rem; opacity: 0; animation: rise .7s .78s forwards; }
        .loader { width: min(75vw, 280px); margin-top: 28px; opacity: 0; animation: rise .7s .93s forwards; }
        .loader__track { height: 3px; overflow: hidden; border-radius: 99px; background: rgba(255,255,255,.09); }
        .loader__fill { display: block; height: 100%; width: 0%; border-radius: inherit; background: linear-gradient(90deg, #0062ff, #7ab4ff); box-shadow: 0 0 18px rgba(0,98,255,.8); transition: width .2s cubic-bezier(.16,1,.3,1); }
        .loader__meta { display: flex; justify-content: space-between; margin-top: 10px; color: #52525b; font-size: .62rem; letter-spacing: .13em; direction: ltr; }
        .hint { margin: 30px 0 0; color: rgba(255,255,255,.4); font-size: .66rem; opacity: 0; animation: rise .7s 1.1s forwards; }
        .hint kbd { padding: 3px 7px; border: 1px solid rgba(255,255,255,.14); border-radius: 6px; font-family: inherit; }
        .ripple { position: fixed; z-index: -1; width: 20px; aspect-ratio: 1; border-radius: 50%; background: rgba(0,98,255,.3); transform: translate(-50%, -50%) scale(0); pointer-events: none; animation: ripple .75s ease-out forwards; }
        @keyframes rise { to { opacity: 1; transform: translateY(0); } from { transform: translateY(14px); } }
        @keyframes glass { from { opacity: 0; transform: translateY(20px) scale(.97); filter: blur(8px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
        @keyframes mark-in { 0% { opacity: 0; transform: scale(.3) rotate(-30deg); filter: blur(12px); } 70% { opacity: 1; transform: scale(1.08) rotate(4deg); filter: blur(0); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes drift { to { transform: translate(-10%, 14%) scale(1.15); } }
        @keyframes grid { to { background-position: 42px 42px; } }
        @keyframes sheen { 45%, 100% { transform: translateX(85%) rotate(20deg); } }
        @keyframes ripple { to { transform: translate(-50%, -50%) scale(34); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } .splash { transition-duration: .01ms; } }
    </style>
</head>
<body>
    <main class="site-shell" aria-label="{{ config('app.name', 'AIO') }}"><span class="site-shell__label">YOUR EXPERIENCE IS READY</span></main>
    <section class="splash" id="splash" aria-label="در حال ورود به سایت" aria-live="polite">
        <div class="grain"></div>
        <div class="splash__content">
            <p class="eyebrow">DIGITAL EXPERIENCE</p>
            <button class="mark" id="splashMark" type="button" aria-label="ورود فوری به سایت"><span class="mark__orbit"></span><span class="mark__orbit mark__orbit--two"></span><span class="mark__core"><img class="mark__image" src="{{ asset('images/logo.png') }}" alt="AIO"></span></button>
            <h1 class="brand">A<em>I</em>O</h1><p class="status" id="statusText">در حال آماده‌سازی تجربه شما</p>
            <div class="loader" aria-hidden="true"><div class="loader__track"><span class="loader__fill" id="loaderFill"></span></div><div class="loader__meta"><span>LOADING</span><span id="progressText">00%</span></div></div>
            <p class="hint">برای ورود سریع، روی لوگو کلیک کنید <kbd>↵</kbd></p>
        </div>
    </section>
    <script>
        (() => {
            const splash = document.getElementById('splash'), mark = document.getElementById('splashMark'), fill = document.getElementById('loaderFill'), progressText = document.getElementById('progressText'), statusText = document.getElementById('statusText'); let finished = false;
            const leave = () => { if (finished) return; finished = true; fill.style.width = '100%'; progressText.textContent = '100%'; statusText.textContent = 'خوش آمدید'; setTimeout(() => splash.classList.add('is-leaving'), 320); };
            const start = performance.now(), duration = 1850; const tick = now => { if (finished) return; const ratio = Math.min((now - start) / duration, 1), value = Math.round((1 - Math.pow(1 - ratio, 3)) * 96); fill.style.width = value + '%'; progressText.textContent = String(value).padStart(2, '0') + '%'; ratio < 1 ? requestAnimationFrame(tick) : leave(); }; requestAnimationFrame(tick);
            const ripple = event => { const ring = document.createElement('span'); ring.className = 'ripple'; ring.style.left = event.clientX + 'px'; ring.style.top = event.clientY + 'px'; document.body.append(ring); ring.addEventListener('animationend', () => ring.remove()); };
            mark.addEventListener('pointerdown', () => mark.classList.add('is-pressed')); mark.addEventListener('pointerup', event => { mark.classList.remove('is-pressed'); ripple(event); leave(); }); mark.addEventListener('pointerleave', () => mark.classList.remove('is-pressed')); window.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === 'Escape') leave(); });
        })();
    </script>
</body>
</html>
