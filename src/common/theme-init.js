/* Applica il tema PRIMA del render per evitare flash. Includere nel <head>. */
(function () {
  try {
    var saved = localStorage.getItem('wapatanka-theme');
    var mode = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', mode);
  } catch (e) {}

  window.ThemeToggle = {
    apply: function (mode) {
      document.documentElement.setAttribute('data-theme', mode);
      try { localStorage.setItem('wapatanka-theme', mode); } catch (e) {}
      var btn = document.getElementById('themeToggleBtn');
      if (btn) btn.setAttribute('aria-label', mode === 'dark' ? 'Attiva tema chiaro' : 'Attiva tema scuro');
    },
    toggle: function () {
      var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      this.apply(cur === 'dark' ? 'light' : 'dark');
    }
  };
})();
