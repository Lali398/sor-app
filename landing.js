/* ============================================================
   LANDING.JS — 3D görgetős vendég-oldal vezérlése
   - Scroll-reveal (IntersectionObserver)
   - Parallax háttér + 3D tilt (rAF-fal fékezve, finom mutatóra)
   - Auth modal nyitás/zárás (a meglévő login/register kártyákhoz)
   Hibatűrő: ha bármi elszáll, az app többi része működik tovább.
   ============================================================ */
(function () {
    'use strict';

    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, { once: true });
        } else {
            fn();
        }
    }

    // ---------------------------------------------------------
    // AUTH MODAL — a régi login/register kártyák burkának kezelése
    // ---------------------------------------------------------
    function setActiveCard(mode) {
        var loginCard = document.getElementById('loginCard');
        var registerCard = document.getElementById('registerCard');
        if (!loginCard || !registerCard) return;
        if (mode === 'register') {
            loginCard.classList.remove('active');
            registerCard.classList.add('active');
        } else {
            registerCard.classList.remove('active');
            loginCard.classList.add('active');
        }
    }

    window.openAuthModal = function (mode) {
        var modal = document.getElementById('authModal');
        if (!modal) return;
        setActiveCard(mode === 'register' ? 'register' : 'login');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('landing-no-scroll');
        document.body.classList.add('landing-no-scroll');
    };

    window.closeAuthModal = function () {
        var modal = document.getElementById('authModal');
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.documentElement.classList.remove('landing-no-scroll');
        document.body.classList.remove('landing-no-scroll');
    };

    ready(function () {
        var guestView = document.getElementById('guestView');
        if (guestView) guestView.classList.add('landing-mode');

        var modal = document.getElementById('authModal');

        // CTA gombok bekötése (hero, nav, záró szekció)
        document.querySelectorAll('[data-auth-open]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                window.openAuthModal(btn.getAttribute('data-auth-open'));
            });
        });

        // Háttérre kattintás → bezárás
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) window.closeAuthModal();
            });
        }
        // Escape → bezárás
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                window.closeAuthModal();
            }
        });

        // Ha a vendég nézet eltűnik (sikeres belépés → switchToUserView),
        // oldjuk fel a görgetés-zárat és zárjuk az auth modalt.
        if (guestView && 'MutationObserver' in window) {
            var mo = new MutationObserver(function () {
                if (guestView.style.display === 'none') {
                    document.documentElement.classList.remove('landing-no-scroll');
                    document.body.classList.remove('landing-no-scroll');
                    if (modal) {
                        modal.classList.remove('active');
                        modal.setAttribute('aria-hidden', 'true');
                    }
                }
            });
            mo.observe(guestView, { attributes: true, attributeFilter: ['style'] });
        }

        // -----------------------------------------------------
        // SCROLL-REVEAL
        // -----------------------------------------------------
        var revealEls = document.querySelectorAll('.reveal');
        if (prefersReduced || !('IntersectionObserver' in window)) {
            revealEls.forEach(function (el) { el.classList.add('in-view'); });
        } else {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                        io.unobserve(entry.target); // egyszer jelenítjük meg
                    }
                });
            }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
            revealEls.forEach(function (el) { io.observe(el); });
        }

        // -----------------------------------------------------
        // FELSŐ NAV — háttér megjelenítése görgetéskor
        // -----------------------------------------------------
        var nav = document.getElementById('landingNav');

        // -----------------------------------------------------
        // GÖRGETÉS-JELZŐ — ugrás a következő szekcióra
        // -----------------------------------------------------
        var indicator = document.querySelector('.scroll-indicator');
        var sections = document.querySelectorAll('.landing-section');
        if (indicator && sections.length > 1) {
            indicator.addEventListener('click', function () {
                sections[1].scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
            });
        }

        // -----------------------------------------------------
        // PARALLAX HÁTTÉR (orbok + rács) — rAF-fal fékezve
        // -----------------------------------------------------
        var orbs = document.querySelectorAll('.landing-orb');
        var grid = document.querySelector('.landing-bg-grid');
        var ticking = false;

        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
                var y = window.scrollY || window.pageYOffset || 0;

                if (nav) nav.classList.toggle('scrolled', y > 30);

                if (!prefersReduced) {
                    if (orbs[0]) orbs[0].style.transform = 'translate3d(0,' + (y * 0.12) + 'px,0)';
                    if (orbs[1]) orbs[1].style.transform = 'translate3d(0,' + (y * -0.08) + 'px,0)';
                    if (orbs[2]) orbs[2].style.transform = 'translate3d(0,' + (y * 0.16) + 'px,0)';
                    if (grid) grid.style.setProperty('--grid-shift', (y * 0.15) + 'px');
                }
                ticking = false;
            });
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        // -----------------------------------------------------
        // 3D TILT a hero / kártyák felett (csak finom mutatóval)
        // -----------------------------------------------------
        if (finePointer && !prefersReduced) {
            var hero = document.querySelector('.hero-3d');
            if (hero) {
                var heroSection = hero.closest('.landing-section') || hero;
                heroSection.addEventListener('pointermove', function (e) {
                    var r = heroSection.getBoundingClientRect();
                    var dx = (e.clientX - r.left) / r.width - 0.5;
                    var dy = (e.clientY - r.top) / r.height - 0.5;
                    hero.style.transform =
                        'rotateY(' + (dx * 10).toFixed(2) + 'deg) rotateX(' + (dy * -10).toFixed(2) + 'deg)';
                }, { passive: true });
                heroSection.addEventListener('pointerleave', function () {
                    hero.style.transform = '';
                }, { passive: true });
            }

            // Funkció- és showcase kártyák enyhe 3D dőlése
            var tiltCards = document.querySelectorAll('.feature-card, .showcase-card');
            tiltCards.forEach(function (card) {
                card.addEventListener('pointermove', function (e) {
                    var r = card.getBoundingClientRect();
                    var dx = (e.clientX - r.left) / r.width - 0.5;
                    var dy = (e.clientY - r.top) / r.height - 0.5;
                    card.style.transform =
                        'translateY(-6px) rotateY(' + (dx * 7).toFixed(2) + 'deg) rotateX(' + (dy * -7).toFixed(2) + 'deg)';
                }, { passive: true });
                card.addEventListener('pointerleave', function () {
                    card.style.transform = '';
                }, { passive: true });
            });
        }
    });
})();
