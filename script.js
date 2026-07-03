/* =========================================================
   EL TAPATIO OF CLINTON — interactions & motion
   Lenis smooth scroll · GSAP ScrollTrigger · Swiper 11
   Degrades gracefully + respects prefers-reduced-motion
   ========================================================= */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------------------------------------------------------
     1. Smooth scroll (Lenis) + GSAP ScrollTrigger sync
  --------------------------------------------------------- */
  let lenis = null;
  const hasGSAP = typeof gsap !== "undefined";
  if (hasGSAP && typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

  if (!reduceMotion && typeof Lenis !== "undefined") {
    lenis = new Lenis({ duration: 1.1, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (hasGSAP && typeof ScrollTrigger !== "undefined") {
      lenis.on("scroll", ScrollTrigger.update);
    }
  }

  /* Anchor links → smooth scroll (works with or without Lenis) */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const id = a.getAttribute("href");
      if (id === "#" || id === "#top") {
        e.preventDefault();
        lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: "smooth" });
        closeOverlay();
        return;
      }
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        closeOverlay();
        const y = target.getBoundingClientRect().top + window.pageYOffset - 70;
        lenis ? lenis.scrollTo(y) : window.scrollTo({ top: y, behavior: "smooth" });
      }
    });
  });

  /* ---------------------------------------------------------
     2. Nav: solidify on scroll
  --------------------------------------------------------- */
  const nav = $("#nav");
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 60) nav.classList.add("is-solid");
      else nav.classList.remove("is-solid");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------------------------------------------------
     3. Mobile overlay menu
  --------------------------------------------------------- */
  const overlay = $("#overlay");
  const toggle = $("#navToggle");
  const overlayClose = $("#overlayClose");

  function openOverlay() {
    if (!overlay) return;
    overlay.classList.add("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    if (lenis) lenis.stop();
  }
  function closeOverlay() {
    if (!overlay || !overlay.classList.contains("is-open")) return;
    overlay.classList.remove("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (lenis) lenis.start();
  }
  toggle && toggle.addEventListener("click", openOverlay);
  overlayClose && overlayClose.addEventListener("click", closeOverlay);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeOverlay(); });

  /* ---------------------------------------------------------
     4. Reveal on scroll (IntersectionObserver, failsafe-safe)
  --------------------------------------------------------- */
  const revealEls = $$("[data-reveal]");
  if (reduceMotion) {
    revealEls.forEach(el => el.classList.add("is-visible"));
  } else if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = el.dataset.delay ? parseFloat(el.dataset.delay) : 0;
          el.style.transition = `opacity .9s cubic-bezier(.22,1,.36,1) ${delay}s, transform .9s cubic-bezier(.22,1,.36,1) ${delay}s`;
          el.classList.add("is-visible");
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach((el, i) => { el.dataset.delay = ((i % 4) * 0.07).toFixed(2); io.observe(el); });
    /* Failsafe: never leave content permanently hidden if the observer under-fires */
    window.addEventListener("load", () => {
      setTimeout(() => {
        revealEls.forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && !el.classList.contains("is-visible")) {
            el.classList.add("is-visible");
          }
        });
      }, 1200);
    });
  } else {
    revealEls.forEach(el => el.classList.add("is-visible"));
  }

  /* ---------------------------------------------------------
     5. Hero: Ken-Burns + parallax
  --------------------------------------------------------- */
  const heroImg = $("#heroImg");
  if (heroImg && !reduceMotion && hasGSAP) {
    gsap.to(heroImg, { scale: 1.0, duration: 9, ease: "power1.out" });
    gsap.to(heroImg, {
      yPercent: 12, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
  } else if (heroImg) {
    heroImg.style.transform = "scale(1.04)";
  }

  /* ---------------------------------------------------------
     6. Signature titles: letter stagger
  --------------------------------------------------------- */
  if (!reduceMotion && hasGSAP) {
    $$("[data-letters]").forEach(el => {
      const text = el.textContent;
      el.innerHTML = text.split("").map(ch =>
        ch === " " ? " " : `<span class="ltr">${ch}</span>`
      ).join("");
      gsap.from(el.querySelectorAll(".ltr"), {
        yPercent: 110, opacity: 0, duration: .8, ease: "power3.out", stagger: 0.02,
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });
  }

  /* ---------------------------------------------------------
     7. Stat counters
  --------------------------------------------------------- */
  const statsSection = $("#stats");
  if (statsSection) {
    const runCounters = () => {
      $$("[data-count]", statsSection).forEach(el => {
        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || "0", 10);
        const suffix = el.dataset.suffix || "";
        if (reduceMotion || !hasGSAP) { el.textContent = target.toFixed(decimals) + suffix; return; }
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.8, ease: "power2.out",
          onUpdate: () => { el.textContent = obj.v.toFixed(decimals) + suffix; }
        });
      });
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries, o) => {
        entries.forEach(e => { if (e.isIntersecting) { runCounters(); o.disconnect(); } });
      }, { threshold: 0.4 });
      io.observe(statsSection);
    } else { runCounters(); }
  }

  /* ---------------------------------------------------------
     8. Swiper carousels
  --------------------------------------------------------- */
  if (typeof Swiper !== "undefined") {
    if ($(".gallery__swiper")) {
      new Swiper(".gallery__swiper", {
        slidesPerView: "auto",
        spaceBetween: 20,
        grabCursor: true,
        navigation: { nextEl: ".gallery__btn--next", prevEl: ".gallery__btn--prev" },
        breakpoints: { 760: { spaceBetween: 28 } }
      });
    }

    if ($(".reviews__swiper")) {
      new Swiper(".reviews__swiper", {
        slidesPerView: 1,
        loop: true,
        autoplay: reduceMotion ? false : { delay: 5200, disableOnInteraction: false },
        speed: 800,
        pagination: { el: ".reviews__dots", clickable: true }
      });
    }
  }

  /* ---------------------------------------------------------
     9. Highlight today's hours row ONLY when actually open now
     Hours: open every day 11:00 AM – 9:00 PM.
     Table row order (tbody): 0 Mon · 1 Tue · 2 Wed · 3 Thu · 4 Fri · 5 Sat · 6 Sun
  --------------------------------------------------------- */
  (function openNow() {
    const rows = $$("#hours tbody tr");
    if (!rows.length) return;
    const now = new Date();
    const day = now.getDay();                          // 0 Sun … 6 Sat
    const mins = now.getHours() * 60 + now.getMinutes();
    const open = mins >= 11 * 60 && mins < 21 * 60;    // 11:00–21:00 every day
    if (!open) return;
    // Map JS getDay() (Sun=0..Sat=6) to our Mon-first table rows (Mon=0..Sun=6)
    const ROW_OF_DAY = { 0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
    const row = rows[ROW_OF_DAY[day]];
    if (row) row.classList.add("is-now");
  })();

  /* ---------------------------------------------------------
     10. Magnetic solid buttons (subtle)
  --------------------------------------------------------- */
  if (!reduceMotion && window.matchMedia("(hover:hover)").matches) {
    $$(".btn--solid").forEach(btn => {
      btn.addEventListener("mousemove", e => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.16;
        const y = (e.clientY - r.top - r.height / 2) * 0.26;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
    });
  }
})();
