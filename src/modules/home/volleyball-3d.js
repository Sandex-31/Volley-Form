/* Palla da volley 3D nella hero. Fallback all'immagine su problemi reali. */
(function () {
  function showFallback() {
    var img = document.querySelector('.hero-3d-fallback');
    var canvasHost = document.getElementById('volleyballCanvas');
    if (img) img.hidden = false;
    if (canvasHost) canvasHost.style.display = 'none';
  }
  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function webglOK() {
    try { var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); }
    catch (e) { return false; }
  }

  function start() {
    var host = document.getElementById('volleyballCanvas');
    if (!host) return;
    if (reducedMotion() || typeof THREE === 'undefined' || !webglOK()) { showFallback(); return; }
    try {
      var w = host.clientWidth, h = host.clientHeight || 320;
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100); camera.position.z = 3.2;
      var renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h); host.appendChild(renderer.domElement);

      // Palla: sfera bianca con "cuciture" navy/rosse via wireframe leggero sovrapposto
      var geo = new THREE.SphereGeometry(1, 48, 48);
      var ball = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .55, metalness: .05 }));
      var seams = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({ color: 0x0D1A3C, wireframe: true, transparent: true, opacity: .18 }));
      seams.scale.setScalar(1.002);
      var group = new THREE.Group(); group.add(ball); group.add(seams); scene.add(group);

      scene.add(new THREE.AmbientLight(0xffffff, .75));
      var key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3, 4, 5); scene.add(key);
      var rim = new THREE.DirectionalLight(0xB22823, .5); rim.position.set(-4, -2, -3); scene.add(rim);

      var targetX = 0, targetY = 0;
      host.addEventListener('pointermove', function (e) {
        var r = host.getBoundingClientRect();
        targetY = ((e.clientX - r.left) / r.width - .5) * 0.6;
        targetX = ((e.clientY - r.top) / r.height - .5) * 0.4;
      });

      var running = true;
      document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) loop(); });
      window.addEventListener('resize', function () {
        var nw = host.clientWidth, nh = host.clientHeight || 320;
        camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);
      });

      var spin = 0;
      function loop() {
        if (!running) return;
        spin += 0.004;                                            // continuous idle spin
        group.rotation.y = spin + targetY;                        // spin + horizontal parallax
        group.rotation.x += (targetX - group.rotation.x) * 0.05;  // vertical parallax easing
        renderer.render(scene, camera);
        requestAnimationFrame(loop);
      }
      loop();
    } catch (e) { showFallback(); }
  }

  // Three.js è caricato con defer: attendere il load completo del documento.
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();
