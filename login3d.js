/* ============================================================
   LOGIN3D.JS — 3D/4D login élmény (auth modal feljavítás)
   A login3d.css párja. Önálló, hibatűrő kiegészítő réteg:
   ha bármi elszáll, a login/regisztráció ugyanúgy működik tovább.

   - 3D tilt: egérrel (asztali) vagy giroszkóppal (mobil)
   - Lágy "fizika": a kártya rugalmasan úszik a célszög felé (lerp)
   - Idle lebegés: ha nem nyúlsz hozzá, magától hullámzik ("4D" idő)
   - Kurzort követő glare + dőléssel ellentétes élő árnyék
   - 3D részecskemező: mélységben úszó sörbuborékok + szikrák,
     kattintásra buborék-robbanás
   - 3D flip a login ⇄ regisztráció kártyaváltásnál
   ============================================================ */
(function () {
    'use strict';

    try {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        function ready(fn) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', fn, { once: true });
            } else {
                fn();
            }
        }

        ready(function () {
            var modal = document.getElementById('authModal');
            if (!modal) return;
            var content = modal.querySelector('.auth-modal-content');
            var container = modal.querySelector('.auth-container');
            if (!content || !container) return;

            modal.classList.add('login3d');

            /* ---- Dekor-elemek beszúrása (hologram-keret + glare) ---- */
            var aurora = document.createElement('div');
            aurora.className = 'l3d-aurora';
            aurora.setAttribute('aria-hidden', 'true');
            container.appendChild(aurora);

            var glare = document.createElement('div');
            glare.className = 'l3d-glare';
            glare.setAttribute('aria-hidden', 'true');
            container.appendChild(glare);

            /* ---- Részecske-vászon a kártya mögé ---- */
            var canvas = document.createElement('canvas');
            canvas.className = 'l3d-canvas';
            canvas.setAttribute('aria-hidden', 'true');
            modal.insertBefore(canvas, modal.firstChild);
            var ctx = canvas.getContext('2d');

            /* =====================================================
               TILT ÁLLAPOT — cél- és aktuális szögek (lerp simítás)
               ===================================================== */
            var MAX_TILT_X = 7;    /* fok, fel-le dőlés */
            var MAX_TILT_Y = 10;   /* fok, jobbra-balra dőlés */
            var targetRX = 0, targetRY = 0;
            var curRX = 0, curRY = 0;
            var lastInputAt = 0;   /* mikor nyúltak hozzá utoljára */
            var gyroActive = false;
            var running = false;
            var rafId = null;

            /* FONTOS: a konténerre (a kártyák ősére) NEM írunk CSS
               változót képkockánként — attól a kártyák var()-alapú
               animációi (theme.css: cardSpring) minden frame-ben
               újraindulnának (Chromium-viselkedés), és a kártya
               örökre opacity:0-n ragadna. Ezért a tilt inline
               transform, a glare-változók pedig magán a glare
               elemen élnek (annak nincs saját animációja). */
            var lastShadowKey = '';
            function setVars(rx, ry) {
                container.style.transform =
                    'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';

                /* Glare: a fényfolt a dőlés "fényforrása" felé csúszik */
                var g = glare.style;
                g.setProperty('--l3d-gx', (50 + ry * 3.2).toFixed(1) + '%');
                g.setProperty('--l3d-gy', (38 - rx * 3.2).toFixed(1) + '%');
                var mag = Math.min(1.6, 0.6 + (Math.abs(rx) + Math.abs(ry)) / 8);
                g.setProperty('--l3d-glow', mag.toFixed(2));

                /* Árnyék a dőléssel ellentétes irányba tolódik —
                   fél pixelre kerekítve, csak tényleges váltásnál írjuk */
                var sx = Math.round(-ry * 4.4) / 2;
                var sy = Math.round((18 + rx * 2.2) * 2) / 2;
                var key = sx + '/' + sy;
                if (key !== lastShadowKey) {
                    lastShadowKey = key;
                    container.style.boxShadow =
                        sx + 'px ' + sy + 'px 60px rgba(0,0,0,.55),' +
                        '0 0 90px rgba(138,115,255,.22)';
                }
            }

            /* ---- Egér-tilt (csak finom mutatóval) ---- */
            if (finePointer) {
                content.addEventListener('pointermove', function (e) {
                    var r = content.getBoundingClientRect();
                    if (!r.width || !r.height) return;
                    var dx = (e.clientX - r.left) / r.width - 0.5;
                    var dy = (e.clientY - r.top) / r.height - 0.5;
                    targetRY = dx * MAX_TILT_Y * 2;
                    targetRX = dy * -MAX_TILT_X * 2;
                    lastInputAt = performance.now();
                }, { passive: true });

                content.addEventListener('pointerleave', function () {
                    targetRX = 0;
                    targetRY = 0;
                }, { passive: true });
            }

            /* ---- Giroszkóp-tilt (mobil): a telefon döntése mozgatja ---- */
            function onGyro(e) {
                if (e.gamma === null || e.beta === null) return;
                gyroActive = true;
                targetRY = Math.max(-MAX_TILT_Y, Math.min(MAX_TILT_Y, e.gamma * 0.45));
                targetRX = Math.max(-MAX_TILT_X, Math.min(MAX_TILT_X, (e.beta - 40) * -0.25));
                lastInputAt = performance.now();
            }

            if (!finePointer && 'DeviceOrientationEvent' in window) {
                if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                    /* iOS: engedélykérés csak felhasználói gesztusból indulhat */
                    modal.addEventListener('click', function reqGyro() {
                        DeviceOrientationEvent.requestPermission().then(function (state) {
                            if (state === 'granted') {
                                window.addEventListener('deviceorientation', onGyro, { passive: true });
                            }
                        }).catch(function () { /* no-op */ });
                        modal.removeEventListener('click', reqGyro);
                    }, { once: true });
                } else {
                    window.addEventListener('deviceorientation', onGyro, { passive: true });
                }
            }

            /* =====================================================
               RÉSZECSKEMEZŐ — 3D térben úszó buborékok és szikrák
               ===================================================== */
            var DPR = Math.min(2, window.devicePixelRatio || 1);
            var particles = [];
            var bursts = [];
            var bubbleSprite = makeBubbleSprite();
            var sparkSprite = makeSparkSprite();

            function makeBubbleSprite() {
                var c = document.createElement('canvas');
                c.width = c.height = 64;
                var g = c.getContext('2d');
                var grad = g.createRadialGradient(26, 22, 4, 32, 32, 30);
                grad.addColorStop(0, 'rgba(255, 240, 190, 0.85)');
                grad.addColorStop(0.35, 'rgba(255, 210, 110, 0.25)');
                grad.addColorStop(0.85, 'rgba(255, 190, 80, 0.10)');
                grad.addColorStop(1, 'rgba(255, 190, 80, 0)');
                g.fillStyle = grad;
                g.beginPath();
                g.arc(32, 32, 30, 0, Math.PI * 2);
                g.fill();
                g.strokeStyle = 'rgba(255, 225, 150, 0.55)';
                g.lineWidth = 2;
                g.beginPath();
                g.arc(32, 32, 28, 0, Math.PI * 2);
                g.stroke();
                return c;
            }

            function makeSparkSprite() {
                var c = document.createElement('canvas');
                c.width = c.height = 32;
                var g = c.getContext('2d');
                var grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
                grad.addColorStop(0, 'rgba(210, 190, 255, 0.95)');
                grad.addColorStop(0.4, 'rgba(138, 115, 255, 0.45)');
                grad.addColorStop(1, 'rgba(138, 115, 255, 0)');
                g.fillStyle = grad;
                g.fillRect(0, 0, 32, 32);
                return c;
            }

            function resizeCanvas() {
                canvas.width = Math.round(window.innerWidth * DPR);
                canvas.height = Math.round(window.innerHeight * DPR);
            }

            function seedParticles() {
                particles.length = 0;
                var count = Math.min(80, Math.round(window.innerWidth * window.innerHeight / 16000));
                for (var i = 0; i < count; i++) {
                    particles.push(newParticle(true));
                }
            }

            function newParticle(anywhere) {
                var spark = Math.random() < 0.35;
                return {
                    spark: spark,
                    x: Math.random() * window.innerWidth,
                    y: anywhere ? Math.random() * window.innerHeight
                                : window.innerHeight + 40,
                    z: 0.35 + Math.random() * 1.4,        /* mélység: kisebb = közelebb */
                    r: spark ? 1.5 + Math.random() * 2.5 : 3 + Math.random() * 9,
                    vy: 0.25 + Math.random() * 0.7,       /* emelkedési sebesség */
                    phase: Math.random() * Math.PI * 2,   /* oldalirányú ringás fázisa */
                    sway: 8 + Math.random() * 22
                };
            }

            function spawnBurst(x, y) {
                for (var i = 0; i < 12; i++) {
                    var a = Math.random() * Math.PI * 2;
                    var sp = 1.5 + Math.random() * 3.5;
                    bursts.push({
                        x: x, y: y,
                        vx: Math.cos(a) * sp,
                        vy: Math.sin(a) * sp - 1,
                        life: 1,
                        r: 2 + Math.random() * 4,
                        spark: Math.random() < 0.5
                    });
                }
            }

            /* Kattintás/koppintás a modalon → buborék-robbanás */
            modal.addEventListener('pointerdown', function (e) {
                if (running) spawnBurst(e.clientX, e.clientY);
            }, { passive: true });

            function drawParticles(t) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.save();
                ctx.scale(DPR, DPR);

                /* Parallaxis: a közeli részecskék erősebben mozdulnak a dőléssel */
                var px = curRY * 4;
                var py = -curRX * 4;

                for (var i = 0; i < particles.length; i++) {
                    var p = particles[i];
                    p.y -= p.vy / p.z;
                    p.phase += 0.008;
                    if (p.y < -50) particles[i] = p = newParticle(false);

                    var sx = p.x + Math.sin(p.phase + t / 1400) * p.sway / p.z + px / p.z;
                    var sy = p.y + py / p.z;
                    var size = (p.r * 2) / p.z;
                    var alpha = Math.min(0.85, 1.1 - p.z * 0.45);

                    ctx.globalAlpha = alpha;
                    ctx.drawImage(p.spark ? sparkSprite : bubbleSprite,
                        sx - size / 2, sy - size / 2, size, size);
                }

                /* Robbanás-szikrák (additív fénnyel) */
                ctx.globalCompositeOperation = 'lighter';
                for (var j = bursts.length - 1; j >= 0; j--) {
                    var b = bursts[j];
                    b.x += b.vx;
                    b.y += b.vy;
                    b.vy -= 0.03; /* a buborékok felfelé gyorsulnak */
                    b.life -= 0.02;
                    if (b.life <= 0) { bursts.splice(j, 1); continue; }
                    ctx.globalAlpha = b.life * 0.9;
                    var bs = b.r * 2 * (1 + (1 - b.life));
                    ctx.drawImage(b.spark ? sparkSprite : bubbleSprite,
                        b.x - bs / 2, b.y - bs / 2, bs, bs);
                }
                ctx.globalCompositeOperation = 'source-over';
                ctx.restore();
            }

            /* =====================================================
               FŐ CIKLUS — tilt-simítás + idle lebegés + rajzolás
               ===================================================== */
            function frame(t) {
                if (!running) return;

                /* Idle "4D" lebegés: ha ~1.6 mp-ig nincs input, a kártya
                   magától, lágyan hullámzik az időben */
                if (!gyroActive && t - lastInputAt > 1600) {
                    targetRX = Math.sin(t / 2300) * 2.2;
                    targetRY = Math.cos(t / 1800) * 3.0;
                }

                /* Rugalmas követés (lerp) — ettől "fizikás" az érzet */
                curRX += (targetRX - curRX) * 0.08;
                curRY += (targetRY - curRY) * 0.08;
                setVars(curRX, curRY);

                drawParticles(t);
                rafId = requestAnimationFrame(frame);
            }

            function start() {
                if (running) return;
                running = true;
                resizeCanvas();
                seedParticles();
                lastInputAt = 0;
                rafId = requestAnimationFrame(frame);
            }

            function stop() {
                running = false;
                if (rafId) cancelAnimationFrame(rafId);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                curRX = curRY = targetRX = targetRY = 0;
                container.style.transform = '';
                container.style.boxShadow = '';
                lastShadowKey = '';
            }

            window.addEventListener('resize', function () {
                if (running) { resizeCanvas(); seedParticles(); }
            }, { passive: true });

            document.addEventListener('visibilitychange', function () {
                if (document.hidden) {
                    if (rafId) cancelAnimationFrame(rafId);
                } else if (running) {
                    rafId = requestAnimationFrame(frame);
                }
            });

            /* =====================================================
               3D FLIP — kártya beúszás nyitáskor és váltáskor
               ===================================================== */
            /* A .l3d-flip az AKTÍV kártyán marad (fill-mode: both tartja
               a végállapotot) — ha az animáció végén levennénk, a
               theme.css cardSpring animációja indulna újra, és a kártya
               még egyszer beúszna. Csak deaktiváláskor kerül le. */
            function flipIn(card) {
                if (!card) return;
                card.classList.remove('l3d-flip');
                void card.offsetWidth; /* reflow: az animáció újraindul */
                card.classList.add('l3d-flip');
            }

            /* A meglévő logika a .active osztályokat kapcsolgatja —
               ezt figyeljük, így semmilyen régi kódot nem kell átírni. */
            if ('MutationObserver' in window) {
                var cardObserver = new MutationObserver(function (muts) {
                    muts.forEach(function (m) {
                        var el = m.target;
                        var wasActive = (m.oldValue || '').indexOf('active') !== -1;
                        var isActive = el.classList.contains('active');
                        if (isActive && !wasActive) {
                            flipIn(el);
                        } else if (!isActive && wasActive) {
                            el.classList.remove('l3d-flip');
                        }
                    });
                });
                ['loginCard', 'registerCard'].forEach(function (id) {
                    var el = document.getElementById(id);
                    if (el) {
                        cardObserver.observe(el, {
                            attributes: true,
                            attributeFilter: ['class'],
                            attributeOldValue: true
                        });
                    }
                });

                /* A modal nyitását/zárását is a class-váltás jelzi */
                var modalObserver = new MutationObserver(function () {
                    if (modal.classList.contains('active')) {
                        start();
                        flipIn(modal.querySelector('.auth-card.active'));
                    } else {
                        stop();
                    }
                });
                modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });

                /* Ha már nyitva volt, mire ideértünk */
                if (modal.classList.contains('active')) start();
            }
        });
    } catch (_) { /* a dizájn-effektek hibája nem akadályozhatja az appot */ }
})();
