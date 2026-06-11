/* ============================================================
   FX.JS — vizuális effektek (ripple, spotlight, 3D tilt)
   Csak kiegészítő réteg: hibák esetén sem zavarja az app működését.
   ============================================================ */
(function () {
    'use strict';

    try {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        /* ---- 1. Ripple effekt a gombokon (eseménydelegálás: a dinamikusan
           létrehozott gombokon is működik) ---- */
        document.addEventListener('pointerdown', function (e) {
            var btn = e.target.closest && e.target.closest('.auth-btn, .action-btn, .recap-btn');
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
                setTimeout(function () { span.remove(); }, 700);
            } catch (_) { /* no-op */ }
        }, { passive: true });

        if (!finePointer) return; /* érintőképernyőn nincs hover-effekt */

        /* ---- 2. Kurzort követő fényfolt a kártyákon + 3. 3D tilt a KPI
           kártyákon (rAF-fal fékezve) ---- */
        var pending = null;

        document.addEventListener('pointermove', function (e) {
            pending = e;
            requestAnimationFrame(applyPointerFx);
        }, { passive: true });

        function applyPointerFx() {
            var e = pending;
            if (!e) return;
            pending = null;
            try {
                var card = e.target.closest && e.target.closest('.card');
                if (card) {
                    var r = card.getBoundingClientRect();
                    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
                }
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
