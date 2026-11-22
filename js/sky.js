/* AETHER 3D WebGL Background (Optimized & Scroll-Damped) */
window.HL = window.HL || {};
(function () {
  var cv = document.getElementById("sky");
  if (!cv || !window.THREE) {
    HL.sky = { setHorizon: function () {}, refresh: function () {}, setScroll: function () {} };
    return;
  }

  var renderer = new THREE.WebGLRenderer({
    canvas: cv,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 5.6;

  // Detail 4 (~2,562 vertices) is 4x faster than detail 5 while remaining ultra-crisp
  var geo = new THREE.IcosahedronGeometry(1.75, 4);
  var basePos = new Float32Array(geo.attributes.position.array);
  var posAttr = geo.attributes.position;
  var pos = posAttr.array;

  var mat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.30
  });

  var mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  // Ambient dust particles
  var pGeo = new THREE.BufferGeometry();
  var pCount = 450;
  var pArr = new Float32Array(pCount * 3);
  for (var i = 0; i < pCount * 3; i++) pArr[i] = (Math.random() - 0.5) * 18;
  pGeo.setAttribute("position", new THREE.BufferAttribute(pArr, 3));
  var pMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.025, transparent: true, opacity: 0.45 });
  var particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  var targetChaos = 1.0;
  var currentChaos = 1.0;
  var targetX = 0.0;
  var currentX = 0.0;
  var targetScale = 1.0;
  var currentScale = 1.0;
  var targetColor = new THREE.Color(0x38bdf8);
  var clock = new THREE.Clock();
  var isHidden = false;

  document.addEventListener("visibilitychange", function () {
    isHidden = document.hidden;
    if (!isHidden) clock.getDelta();
  });

  function animate() {
    requestAnimationFrame(animate);
    if (isHidden) return;

    var t = clock.getElapsedTime();

    // Smoothly damp scroll-driven values to eliminate scroll stutter
    currentChaos += (targetChaos - currentChaos) * 0.08;
    currentX += (targetX - currentX) * 0.08;
    currentScale += (targetScale - currentScale) * 0.08;

    var c = currentChaos;
    var pulseBase = Math.sin(t * 1.2) * 0.035 * (1 - c);

    for (var i = 0; i < pos.length; i += 3) {
      var bx = basePos[i], by = basePos[i + 1], bz = basePos[i + 2];
      var noise = Math.sin(bx * 3.4 + t * 1.3) * Math.cos(by * 3.4 + t * 1.05) * Math.sin(bz * 3.4 + t * 0.85);
      var disp = 1 + (noise * 0.52 * c) + pulseBase;
      pos[i] = bx * disp;
      pos[i + 1] = by * disp;
      pos[i + 2] = bz * disp;
    }
    posAttr.needsUpdate = true;

    mesh.position.x = currentX;
    mesh.scale.setScalar(currentScale);
    mesh.rotation.y = t * 0.13;
    mesh.rotation.x = Math.sin(t * 0.1) * 0.22;
    particles.rotation.y = -t * 0.025;
    mat.color.lerp(targetColor, 0.06);

    renderer.render(scene, camera);
  }
  animate();

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }, 100);
  });

  HL.sky = {
    setHorizon: function (hex) {
      if (hex) targetColor.set(hex);
    },
    refresh: function () {
      var isDawn = document.documentElement.getAttribute("data-sky") === "dawn";
      mat.opacity = isDawn ? 0.22 : 0.30;
      pMat.color.set(isDawn ? 0x475569 : 0x94a3b8);
    },
    setScroll: function (y) {
      var maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      var progress = Math.min(1, Math.max(0, y / maxScroll));
      targetChaos = Math.max(0.04, 1.0 - progress * 1.45);
      targetX = Math.sin(progress * Math.PI) * 0.95;
      targetScale = 1.0 - progress * 0.12;
    }
  };
})();
