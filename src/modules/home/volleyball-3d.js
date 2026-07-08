/**
 * Scroll-driven 3D volleyball for the immersive home.
 *
 * A single Three.js sphere lives in a fixed, full-viewport stage (#ballStage)
 * behind the content. A procedurally-built texture (white ball + red seams +
 * the team logo stamped a few times around the equator) is mapped onto it, so
 * the logo swings into view as the ball spins. Position, scale and rotation are
 * driven by scroll progress and eased each frame for a fluid feel.
 *
 * Falls back to a static logo image on: prefers-reduced-motion, missing WebGL,
 * Three.js not loaded (CDN blocked / SRI mismatch), or any runtime exception.
 */
(function () {
    var LOGO_SRC = '../assets/logo-wapatanka.png';
    var RED = '#B22823';

    function showFallback() {
        var stage = document.getElementById('ballStage');
        var img = document.querySelector('.ball-fallback');
        if (stage) stage.style.display = 'none';
        if (img) img.hidden = false;
    }

    function reducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function webglOK() {
        try {
            var c = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
        } catch (e) { return false; }
    }

    /* Build the equirectangular ball texture onto a reusable canvas. */
    function drawBall(ctx, w, h, logoImg) {
        var cols = 6;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        // Subtle alternating panel tint for depth
        for (var i = 0; i < cols; i++) {
            if (i % 2 === 0) {
                ctx.fillStyle = 'rgba(13,26,60,0.035)';
                ctx.fillRect((i * w) / cols, 0, w / cols, h);
            }
        }

        // Red curved vertical seams
        ctx.strokeStyle = RED;
        ctx.lineWidth = Math.max(8, w * 0.007);
        ctx.lineCap = 'round';
        for (var s = 0; s <= cols; s++) {
            var baseX = (s * w) / cols;
            ctx.beginPath();
            for (var y = 0; y <= h; y += 10) {
                var off = Math.sin((y / h) * Math.PI * 2) * (w / cols) * 0.10;
                var x = baseX + off;
                if (y === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Stamp the team logo twice around the equator, clipped to a circle so
        // the logo's square white background is not visible on the ball.
        if (logoImg) {
            var size = h * 0.46;
            var r = size / 2;
            [0.25, 0.75].forEach(function (u) {
                var cx = u * w, cy = h * 0.5;
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(logoImg, cx - r, cy - r, size, size);
                ctx.restore();
            });
        }
    }

    function start() {
        var stage = document.getElementById('ballStage');
        if (!stage) return;
        if (reducedMotion() || typeof THREE === 'undefined' || !webglOK()) { showFallback(); return; }

        try {
            var W = window.innerWidth, H = window.innerHeight;

            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
            camera.position.z = 5;

            var renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, alpha: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setSize(W, H);
            renderer.setClearColor(0x000000, 0);
            stage.appendChild(renderer.domElement);

            // Texture canvas (reused; redrawn once the logo image loads)
            var texCanvas = document.createElement('canvas');
            texCanvas.width = 2048; texCanvas.height = 1024;
            var tctx = texCanvas.getContext('2d');
            drawBall(tctx, texCanvas.width, texCanvas.height, null);

            var texture = new THREE.CanvasTexture(texCanvas);
            if (renderer.capabilities.getMaxAnisotropy) texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            if ('colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;

            var geo = new THREE.SphereGeometry(1, 64, 64);
            var mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.62, metalness: 0.04 });
            var ball = new THREE.Mesh(geo, mat);
            var group = new THREE.Group();
            group.add(ball);
            scene.add(group);

            scene.add(new THREE.AmbientLight(0xffffff, 0.85));
            var key = new THREE.DirectionalLight(0xffffff, 1.05);
            key.position.set(5, 5, 6);
            scene.add(key);
            var rim = new THREE.DirectionalLight(new THREE.Color(RED), 0.4);
            rim.position.set(-5, -3, -4);
            scene.add(rim);

            // Load the logo, then redraw the texture with it stamped on
            var logo = new Image();
            logo.onload = function () {
                drawBall(tctx, texCanvas.width, texCanvas.height, logo);
                texture.needsUpdate = true;
            };
            logo.src = LOGO_SRC;

            // Eased scroll-driven state
            var cur = { x: 2.4, y: 0, scale: 1.55, rot: 0 };
            var target = { x: 2.4, y: 0, scale: 1.55, rot: 0 };

            function scrollProgress() {
                var doc = document.documentElement;
                var max = (doc.scrollHeight - window.innerHeight) || 1;
                var p = window.scrollY / max;
                return Math.max(0, Math.min(1, p));
            }

            // Ball flight path as scroll waypoints. x,y are fractions of the
            // visible half-width / half-height. Interpolated with smoothstep.
            // right (start) → top-centre exiting the top → far left → bottom-left.
            var PATH = [
                { p: 0.00, x: 1.00, y: 0.00 },
                { p: 0.30, x: 0.00, y: 1.25 },
                { p: 0.64, x: -1.00, y: 0.05 },
                { p: 1.00, x: -1.00, y: -0.95 }
            ];

            function pathAt(p) {
                for (var i = 0; i < PATH.length - 1; i++) {
                    var a = PATH[i], b = PATH[i + 1];
                    if (p <= b.p || i === PATH.length - 2) {
                        var t = (p - a.p) / (b.p - a.p);
                        t = Math.max(0, Math.min(1, t));
                        t = t * t * (3 - 2 * t); // smoothstep
                        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
                    }
                }
                return { x: PATH[PATH.length - 1].x, y: PATH[PATH.length - 1].y };
            }

            function updateTargets() {
                var p = scrollProgress();
                var halfH = Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
                var halfW = halfH * camera.aspect;
                var ampX = Math.min(2.6, halfW * 0.78);
                var pt = pathAt(p);
                target.x = pt.x * ampX;
                target.y = pt.y * halfH;
                target.scale = 1.5 - 0.45 * p;   // big in hero, shrinks a bit
                target.rot = p * Math.PI * 4;    // logo swings past as you scroll
            }
            updateTargets();

            var running = true;
            var idle = 0;

            function loop() {
                if (!running) return;
                idle += 0.00012; // very slow drift when the user is not scrolling
                cur.x += (target.x - cur.x) * 0.08;
                cur.y += (target.y - cur.y) * 0.08;
                cur.scale += (target.scale - cur.scale) * 0.08;
                cur.rot += (target.rot - cur.rot) * 0.08;

                group.position.set(cur.x, cur.y, 0);
                group.scale.setScalar(cur.scale);
                group.rotation.y = cur.rot + idle * Math.PI * 2;
                group.rotation.x = -0.18;

                renderer.render(scene, camera);
                requestAnimationFrame(loop);
            }
            loop();

            window.addEventListener('scroll', updateTargets, { passive: true });
            window.addEventListener('resize', function () {
                W = window.innerWidth; H = window.innerHeight;
                camera.aspect = W / H; camera.updateProjectionMatrix();
                renderer.setSize(W, H);
                updateTargets();
            });
            document.addEventListener('visibilitychange', function () {
                running = !document.hidden;
                if (running) loop();
            });
        } catch (e) {
            showFallback();
        }
    }

    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start);
})();
