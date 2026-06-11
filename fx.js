/* ============================================================
   FX.JS v3 — "NEON HUD" effektréteg
   Részecskeháló-háttér, cím-dekódolás, KPI-számlálók, ripple,
   3D tilt, glitch. Csak kiegészítő réteg: bármely része hibázik,
   az app működése változatlan marad.
   ============================================================ */
(function () {
    'use strict';

    try {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        /* ---- Accent szín kiolvasása (a témaválasztóval együtt él) ---- */
        function accentRGB() {
            try {
                var v = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
                var m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
                if (m) {
                    var h = m[1];
                    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
                    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
                }
            } catch (_) { /* no-op */ }
            return [0, 229, 255];
        }

        /* ============================================================
           1. RÉSZECSKEHÁLÓ (plexus) háttér-canvas
           ============================================================ */
        (function plexus() {
            var canvas = document.createElement('canvas');
            canvas.id = 'fxPlexus';
            document.body.insertBefore(canvas, document.body.firstChild);
            var ctx = canvas.getContext('2d');
            var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            var W = 0, H = 0, pts = [], rgb = accentRGB();
            var MAGENTA = [255, 46, 196];
            var running = true;

            function resize() {
                W = window.innerWidth;
                H = window.innerHeight;
                canvas.width = W * dpr;
                canvas.height = H * dpr;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                var target = Math.min(W < 768 ? 36 : 80, Math.round(W * H / 22000));
                pts = [];
                for (var i = 0; i < target; i++) {
                    pts.push({
                        x: Math.random() * W,
                        y: Math.random() * H,
                        vx: (Math.random() - .5) * .45,
                        vy: (Math.random() - .5) * .45,
                        m: Math.random() < .22 /* magenta részecske */
                    });
                }
            }

            var LINK = 130;

            function frame() {
                if (!running) return;
                ctx.clearRect(0, 0, W, H);
                var i, j, p, q, dx, dy, d2, a;
                for (i = 0; i < pts.length; i++) {
                    p = pts[i];
                    p.x += p.vx; p.y += p.vy;
                    if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
                    if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
                }
                ctx.lineWidth = 1;
                for (i = 0; i < pts.length; i++) {
                    p = pts[i];
                    for (j = i + 1; j < pts.length; j++) {
                        q = pts[j];
                        dx = p.x - q.x; dy = p.y - q.y;
                        d2 = dx * dx + dy * dy;
                        if (d2 < LINK * LINK) {
                            a = (1 - Math.sqrt(d2) / LINK) * .32;
                            ctx.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a.toFixed(3) + ')';
                            ctx.beginPath();
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(q.x, q.y);
                            ctx.stroke();
                        }
                    }
                }
                for (i = 0; i < pts.length; i++) {
                    p = pts[i];
                    var c = p.m ? MAGENTA : rgb;
                    ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',.85)';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 1.6, 0, 6.2832);
                    ctx.fill();
                }
                requestAnimationFrame(frame);
            }

            window.addEventListener('resize', resize, { passive: true });
            document.addEventListener('visibilitychange', function () {
                var was = running;
                running = !document.hidden;
                if (running && !was) requestAnimationFrame(frame);
            });
            /* Témaváltás követése: időnként újraolvassuk az accent színt */
            setInterval(function () { rgb = accentRGB(); }, 4000);

            resize();
            requestAnimationFrame(frame);
        })();

        /* ============================================================
           2. CÍM-DEKÓDOLÁS a bejelentkező képernyőn
           ============================================================ */
        (function scramble() {
            var el = document.querySelector('.app-title');
            if (!el) return;
            var original = el.textContent;
            if (!original || original.length > 80) return;
            var CHARS = '!<>-_\\/[]{}=+*^?#01';
            var start = null, DUR = 1100;

            function tick(ts) {
                if (!start) start = ts;
                var t = Math.min(1, (ts - start) / DUR);
                var reveal = Math.floor(original.length * t);
                var out = original.slice(0, reveal);
                for (var i = reveal; i < original.length; i++) {
                    out += original[i] === ' ' ? ' ' : CHARS[(Math.random() * CHARS.length) | 0];
                }
                el.textContent = out;
                if (t < 1) requestAnimationFrame(tick);
                else el.textContent = original; /* mindig pontosan visszaáll */
            }
            requestAnimationFrame(tick);
        })();

        /* ============================================================
           3. KPI SZÁMLÁLÓ-ANIMÁCIÓ (a js.js által írt értékekre)
           ============================================================ */
        (function counters() {
            if (!window.MutationObserver) return;

            function animate(el) {
                var target = el.textContent;
                if (el.__fxTarget === target) return; /* már ezt animáljuk/animáltuk */
                var m = target.match(/^(-?\d+(?:[.,]\d+)?)(.*)$/);
                if (!m) { el.__fxTarget = target; return; }
                var numStr = m[1], suffix = m[2] || '';
                var sep = numStr.indexOf(',') > -1 ? ',' : '.';
                var decimals = numStr.indexOf(sep) > -1 ? numStr.split(sep)[1].length : 0;
                var num = parseFloat(numStr.replace(',', '.'));
                if (!isFinite(num) || Math.abs(num) > 1e7) { el.__fxTarget = target; return; }

                el.__fxTarget = target;
                var token = (el.__fxToken = (el.__fxToken || 0) + 1);
                var start = null, DUR = 850;

                function step(ts) {
                    if (el.__fxToken !== token) return;          /* újabb animáció indult */
                    if (el.textContent !== el.__fxLastWrite && start !== null) {
                        el.__fxTarget = null; return;             /* külső írás — átengedjük */
                    }
                    if (!start) start = ts;
                    var t = Math.min(1, (ts - start) / DUR);
                    var eased = 1 - Math.pow(1 - t, 3);
                    if (t < 1) {
                        var cur = (num * eased).toFixed(decimals).replace('.', sep);
                        el.__fxLastWrite = cur + suffix;
                        el.textContent = el.__fxLastWrite;
                        requestAnimationFrame(step);
                    } else {
                        el.__fxLastWrite = target;
                        el.textContent = target;                  /* pontos végérték */
                    }
                }
                el.__fxLastWrite = el.textContent;
                requestAnimationFrame(step);
            }

            function scan(root) {
                try {
                    root.querySelectorAll('.kpi-card p').forEach(animate);
                } catch (_) { /* no-op */ }
            }

            var pending = null;
            var mo = new MutationObserver(function () {
                if (pending) return;
                pending = setTimeout(function () {
                    pending = null;
                    document.querySelectorAll('.kpi-grid').forEach(scan);
                }, 60);
            });

            function arm() {
                document.querySelectorAll('.kpi-grid').forEach(function (grid) {
                    mo.observe(grid, { childList: true, characterData: true, subtree: true });
                });
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', arm);
            } else {
                arm();
            }
        })();

        /* ============================================================
           4. RIPPLE a gombokon (delegált — dinamikus gombokon is él)
           ============================================================ */
        document.addEventListener('pointerdown', function (e) {
            var btn = e.target.closest && e.target.closest('.auth-btn, .action-btn, .recap-btn, .story-btn, .ticket-reply-btn');
            if (!btn) return;
            try {
                var rect = btn.getBoundingClientRect();
                var size = Math.max(rect.width, rect.height);
                var span = document.createElement('span');
                span.className = 'fx-ripple';
                span.style.width = span.style.height = size + 'px';
                span.style.left = (e.clientX - rect.left - size / 2) + 'px';
                span.style.top = (e.clientY - rect.top - size / 2) + 'px';
                btn.appendChild(span);
                setTimeout(function () { span.remove(); }, 650);
            } catch (_) { /* no-op */ }
        }, { passive: true });

        /* ============================================================
           5. DIGITÁLIS GLITCH fül- és menüváltáskor
           ============================================================ */
        document.addEventListener('click', function (e) {
            var t = e.target.closest && e.target.closest('.nav-item, .main-tab-btn, .stat-tab-btn, .stats-sub-btn');
            if (!t) return;
            t.classList.remove('fx-glitch');
            void t.offsetWidth; /* animáció újraindítása */
            t.classList.add('fx-glitch');
            setTimeout(function () { t.classList.remove('fx-glitch'); }, 320);
        }, { passive: true });

        if (!finePointer) return; /* érintőn nincs hover-effekt */

        /* ============================================================
           6. 3D TILT a KPI kártyákon
           ============================================================ */
        var pendingEv = null;

        document.addEventListener('pointermove', function (e) {
            pendingEv = e;
            requestAnimationFrame(applyTilt);
        }, { passive: true });

        function applyTilt() {
            var e = pendingEv;
            if (!e) return;
            pendingEv = null;
            try {
                var kpi = e.target.closest && e.target.closest('.kpi-card');
                if (kpi) {
                    var k = kpi.getBoundingClientRect();
                    var dx = (e.clientX - k.left) / k.width - 0.5;
                    var dy = (e.clientY - k.top) / k.height - 0.5;
                    kpi.classList.add('fx-tilt');
                    kpi.style.setProperty('--ry', (dx * 10).toFixed(2) + 'deg');
                    kpi.style.setProperty('--rx', (dy * -10).toFixed(2) + 'deg');
                }
            } catch (_) { /* no-op */ }
        }

        document.addEventListener('pointerout', function (e) {
            var kpi = e.target.closest && e.target.closest('.kpi-card');
            if (kpi && (!e.relatedTarget || !kpi.contains(e.relatedTarget))) {
                kpi.classList.remove('fx-tilt');
                kpi.style.removeProperty('--rx');
                kpi.style.removeProperty('--ry');
            }
        }, { passive: true });
    } catch (_) { /* a dizájn-effektek hibája nem akadályozhatja az appot */ }
})();
