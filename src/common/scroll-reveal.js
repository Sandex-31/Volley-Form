/* Rivela elementi .reveal quando entrano nel viewport. */
(function () {
  function init() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) ||
        (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });

    // Lists rendered later from Firebase: tag each new child so it cascades in
    var STAGGER = '.players-grid, .exercises-list, .responses-list, #matchesTableBody, .roster-preview-grid, .stats-tiles, .pd-stats, .stats-grid';
    var tag = function (list) {
      Array.prototype.forEach.call(list.children, function (child, i) {
        if (child.classList.contains('stagger-item')) return;
        child.classList.add('stagger-item');
        child.style.setProperty('--i', Math.min(i, 12));
        io.observe(child);
      });
    };
    document.querySelectorAll(STAGGER).forEach(function (list) {
      tag(list);
      new MutationObserver(function () { tag(list); }).observe(list, { childList: true });
    });
  }

  // Pointer spotlight on cards: one delegated listener, CSS does the drawing
  var SPOT = '.player-card, .response-card, .exercise-item, .player-stat-card, .player-preview-card, .match-preview-card, .stats-tiles > *';
  document.addEventListener('pointermove', function (e) {
    var card = e.target.closest && e.target.closest(SPOT);
    if (!card) return;
    var r = card.getBoundingClientRect();
    card.classList.add('spot');
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
