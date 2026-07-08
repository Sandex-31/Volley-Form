/**
 * Home scroll FX — ties the full-page sections together as the user scrolls.
 *  - Parallax brand "aurora" blobs in the fixed background (#bgFx)
 *  - A scroll progress bar under the navbar (#scrollProgress)
 *  - Section dots that track the active pane and jump to it (#sectionDots)
 * Presentation only; respects prefers-reduced-motion for the parallax.
 */
(function () {
    function init() {
        var panes = Array.prototype.slice.call(document.querySelectorAll('.pane'));
        var bar = document.getElementById('scrollProgress');
        var dotsWrap = document.getElementById('sectionDots');
        var blob1 = document.querySelector('#bgFx .blob-1');
        var blob2 = document.querySelector('#bgFx .blob-2');
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Build one dot per pane
        var dots = [];
        if (dotsWrap) {
            panes.forEach(function (pane, i) {
                var b = document.createElement('button');
                b.type = 'button';
                b.setAttribute('aria-label', pane.getAttribute('data-label') || ('Sezione ' + (i + 1)));
                b.addEventListener('click', function () {
                    pane.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
                dotsWrap.appendChild(b);
                dots.push(b);
            });
        }

        function onScroll() {
            var doc = document.documentElement;
            var max = (doc.scrollHeight - window.innerHeight) || 1;
            var y = window.scrollY;
            var p = Math.max(0, Math.min(1, y / max));

            if (bar) bar.style.width = (p * 100) + '%';

            if (!reduce) {
                if (blob1) blob1.style.transform = 'translate3d(' + (-y * 0.04) + 'px,' + (y * 0.12) + 'px,0)';
                if (blob2) blob2.style.transform = 'translate3d(' + (y * 0.07) + 'px,' + (-y * 0.05) + 'px,0)';
            }
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        onScroll();

        // Highlight the dot of the pane currently in view
        if (dots.length && 'IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.isIntersecting) {
                        var idx = panes.indexOf(e.target);
                        dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
                    }
                });
            }, { threshold: 0.5 });
            panes.forEach(function (pane) { io.observe(pane); });
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
