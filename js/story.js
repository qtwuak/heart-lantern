/* AETHER Scrollytelling Choreography (Zero-Reflow + Lenis + GPU-Accelerated) */
window.HL = window.HL || {};
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

  // 1. Initialize Lenis Smooth Scroll
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({
      duration: 1.05,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 1.0
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // Expose helper so app.js route changes reset scroll cleanly without Lenis fighting
  HL.scrollToTop = function () {
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
      lenis.resize();
    } else {
      window.scrollTo(0, 0);
    }
    measure();
    update();
  };

  // 2. Scroll Reveal & Number Counters (0, 10, 24h) + SDG badges
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.classList.add("in");
      if (e.target.classList.contains("count")) countUp(e.target);
    });
  }, { threshold: 0.12 }) : null;

  function countUp(el) {
    var to = Number(el.dataset.to) || 0;
    if (to === 0) { el.textContent = "0"; return; }
    var start = null, dur = 1100;
    function step(ts) {
      if (!start) start = ts;
      var p = clamp((ts - start) / dur, 0, 1);
      el.textContent = String(Math.round(ease(p) * to));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  HL.reveal = function (root) {
    if (!io || !root) return;
    $$(".card, .stat, .head, .tile, .gcard, .rcard, .vitem, .count", root).forEach(function (el) {
      if (!el.classList.contains("count")) el.classList.add("reveal");
      io.observe(el);
    });
  };

  // Populate SDG row on home page
  var sdgrow = $("#sdgrow");
  if (sdgrow && HL.data && HL.data.sdgs) {
    HL.data.sdgs.forEach(function (g) {
      var item = document.createElement("div");
      item.className = "sdgitem";
      var b = document.createElement("b");
      b.textContent = "SDG " + g.n;
      var span = document.createElement("span");
      span.textContent = g.name;
      item.appendChild(b);
      item.appendChild(span);
      sdgrow.appendChild(item);
    });
  }

  // Enable drag-to-scroll on horizontal feature rail
  var track = $(".rail-track");
  if (track) {
    var isDown = false, startX = 0, scrollLeft = 0;
    track.addEventListener("mousedown", function (e) {
      isDown = true;
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
    });
    window.addEventListener("mouseup", function () { isDown = false; });
    track.addEventListener("mousemove", function (e) {
      if (!isDown) return;
      e.preventDefault();
      var x = e.pageX - track.offsetLeft;
      track.scrollLeft = scrollLeft - (x - startX) * 1.4;
    });
  }

  var home = $("#v-home");
  if (!home) return;
  var hero = $("#hero"), story = $("#story"), bar = $("#scrollbar");
  var chaps = $$(".chap", story), vis = $$(".vis", story), dots = $$(".story-dots i", story);

  // Move vlabel inside orbcard for cleaner visual framing
  var orbcard = $("#orbcard"), vlabel = $("#vlabel");
  if (orbcard && vlabel && vlabel.parentNode !== orbcard) {
    orbcard.appendChild(vlabel);
  }

  // Build Chapter 2 Z-axis thought layers
  var lsky = $("#lsky");
  var thoughtTexts = [
    "// 02:14 AM — 'Everyone else in my major has it figured out.'",
    "// EXAM WEEK — 'What if my mind goes completely blank?'",
    "// OVERLOAD — 'Too many tabs open in my head.'"
  ];
  var layers = [];
  if (lsky) {
    lsky.innerHTML = "";
    lsky.style.display = "grid";
    lsky.style.placeItems = "center";
    thoughtTexts.forEach(function (txt, idx) {
      var card = document.createElement("div");
      card.className = "thought-layer";
      card.textContent = txt;
      card.style.zIndex = String(10 - idx);
      lsky.appendChild(card);
      layers.push(card);
    });
  }

  var ring = $("#ringProg"), orb2 = $("#orb2"), rlabel = $("#rlabel"), RC = 603.2;

  // Cache layout metrics so scroll handler NEVER causes layout thrashing/reflow
  var metrics = { vh: window.innerHeight, docH: 1, storyTop: 0, storyTotal: 1 };
  function measure() {
    metrics.vh = window.innerHeight;
    metrics.docH = Math.max(1, document.documentElement.scrollHeight - metrics.vh);
    if (story && !home.hidden) {
      var rect = story.getBoundingClientRect();
      metrics.storyTop = rect.top + (window.scrollY || window.pageYOffset || 0);
      metrics.storyTotal = Math.max(1, story.offsetHeight - metrics.vh);
    }
  }

  var lastHorizon = "";
  function setHorizonOnce(hex) {
    if (hex !== lastHorizon && HL.sky && HL.sky.setHorizon) {
      lastHorizon = hex;
      HL.sky.setHorizon(hex);
    }
  }

  var ticking = false;
  function update() {
    ticking = false;
    var sy = window.scrollY || window.pageYOffset || 0;

    if (HL.sky && HL.sky.setScroll) HL.sky.setScroll(sy);
    if (home.hidden) {
      if (bar) bar.style.transform = "scaleX(0)";
      return;
    }

    if (bar) {
      bar.style.transform = "scaleX(" + clamp(sy / metrics.docH, 0, 1).toFixed(4) + ")";
    }

    // Hero parallax scrub
    var hp = clamp(sy / (metrics.vh * 0.85), 0, 1);
    if (hero) hero.style.setProperty("--hp", hp.toFixed(3));

    // Pinned Story Scrub (0 -> 1 across 3 chapters) using cached coordinates
    var p = clamp((sy - metrics.storyTop) / metrics.storyTotal, 0, 1);
    var N = 3, best = 0, bo = -1;

    for (var i = 0; i < chaps.length; i++) {
      var cen = (i + 0.5) / N;
      var d = Math.abs(p - cen) * N;
      var o = clamp(1 - (d - 0.20) * 3.0, 0, 1);
      var y = (cen - p) * N * 36;
      chaps[i].style.opacity = o.toFixed(3);
      chaps[i].style.transform = "translate3d(0," + y.toFixed(1) + "px,0)";
      chaps[i].classList.toggle("active", o > 0.5);
      if (vis[i]) {
        vis[i].style.opacity = o.toFixed(3);
        vis[i].classList.toggle("active", o > 0.5);
      }
      if (o > bo) { bo = o; best = i; }
    }
    for (var j = 0; j < dots.length; j++) {
      dots[j].classList.toggle("on", j === best);
    }

    // Chapter 1: GPU-composited Clip-Path Horizon Expansion
    var t1 = clamp(p * N, 0, 1);
    if (orbcard) {
      var insetVal = ((1 - ease(t1)) * 30).toFixed(1);
      orbcard.style.clipPath = "inset(" + insetVal + "% " + insetVal + "% " + insetVal + "% " + insetVal + "% round 22px)";
      if (vlabel) {
        vlabel.textContent = t1 < 0.45 ? "Tunnel Vision · " + Math.round((1 - t1) * 100) + "%" : "Open Horizon";
      }
      if (best === 0) setHorizonOnce(t1 < 0.45 ? "#f43f5e" : "#38bdf8");
    }

    // Chapter 2: Z-Axis Camera Fly-Through (pure transform + opacity, zero blur lag)
    var t2 = clamp((p - 1 / 3) * N, 0, 1);
    for (var k = 0; k < layers.length; k++) {
      var localP = clamp((t2 * 1.45) - (k * 0.24), 0, 1);
      var scale = 0.82 + localP * 0.78;
      var yOff = (k - 1) * 44 * (1 - localP);
      var opacity = localP < 0.18 ? localP / 0.18 : localP > 0.72 ? 1 - ((localP - 0.72) / 0.28) : 1;
      layers[k].style.transform = "translate3d(0," + yOff.toFixed(1) + "px,0) scale(" + scale.toFixed(3) + ")";
      layers[k].style.opacity = clamp(opacity, 0, 1).toFixed(3);
    }
    if (best === 1) setHorizonOnce("#8b5cf6");

    // Chapter 3: 4-7-8 Grounding Ring
    var t3 = clamp((p - 2 / 3) * N, 0, 1);
    var ph = (t3 * 2) % 1, inh = ph < 0.5;
    if (ring) ring.style.strokeDashoffset = (RC * (1 - t3)).toFixed(1);
    if (orb2) {
      var orbScale = inh ? 0.56 + 0.42 * ease(ph * 2) : 0.98 - 0.42 * ease((ph - 0.5) * 2);
      orb2.style.background = "radial-gradient(circle at 35% 30%, #e0f2fe, #38bdf8 55%, #10b981)";
      orb2.style.transform = "translate(-50%, -50%) scale(" + orbScale.toFixed(3) + ")";
    }
    if (rlabel) {
      rlabel.textContent = t3 <= 0.02 ? "Breathe in" : t3 >= 0.98 ? "Grounded." : inh ? "Breathe in" : "Breathe out";
    }
    if (best === 2) setHorizonOnce("#10b981");
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    measure();
    if (lenis) lenis.resize();
    onScroll();
  }, { passive: true });

  HL.storyUpdate = function () {
    measure();
    update();
  };

  var see = $("#seeHow");
  if (see) {
    see.addEventListener("click", function () {
      measure();
      if (lenis) {
        lenis.scrollTo(story, { offset: 0 });
      } else {
        story.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  // Re-measure after fonts/images settle
  setTimeout(function () { measure(); update(); }, 120);
  measure();
  update();
})();
