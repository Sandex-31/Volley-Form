/* SVG icon set — currentColor eredita il colore dal contesto. */
window.Icons = (function () {
  var P = 'stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  var S = { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', width: '1em', height: '1em' };
  function wrap(inner) {
    return '<svg xmlns="' + S.xmlns + '" viewBox="' + S.viewBox + '" width="' + S.width + '" height="' + S.height + '" ' + P + ' aria-hidden="true">' + inner + '</svg>';
  }
  var defs = {
    home:      '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    form:      '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    exercises: '<circle cx="7" cy="12" r="2.5"/><circle cx="17" cy="12" r="2.5"/><path d="M9.5 12h5M4.5 12H3M21 12h-1.5"/>',
    responses: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    matches:   '<path d="M12 2l3 5 5 1-4 4 1 6-5-3-5 3 1-6-4-4 5-1z"/>',
    players:   '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0112 0"/><path d="M16 6a3 3 0 010 6M21 20a6 6 0 00-4-5.6"/>',
    ai:        '<rect x="3" y="6" width="14" height="12" rx="2"/><path d="M17 10l4-2v8l-4-2"/>',
    manage:    '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1l2-1.6-2-3.4-2.3 1a7 7 0 00-1.7-1L16.5 2h-4l-.4 2.4a7 7 0 00-1.7 1l-2.3-1-2 3.4 2 1.6a7 7 0 000 2l-2 1.6 2 3.4 2.3-1a7 7 0 001.7 1l.4 2.4h4l.4-2.4a7 7 0 001.7-1l2.3 1 2-3.4-2-1.6a7 7 0 00.1-1z"/>',
    ball:      '<circle cx="12" cy="12" r="9"/><path d="M12 3a15 15 0 000 18M3.5 8.5c6 2 11 2 17 0M3.5 15.5c6-2 11-2 17 0"/>',
    calendar:  '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
    'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    sun:  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
    moon: '<path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/>'
  };
  return { get: function (n) { return defs[n] ? wrap(defs[n]) : ''; } };
})();
