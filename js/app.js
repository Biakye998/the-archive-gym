"use strict";

/* ============================================================
   THE ARCHIVE — Interactive Components
   ============================================================ */

class ArchiveApp {
  constructor() {
    this.nav = null;
    this.navToggle = null;
    this.navMobile = null;
    this.navClose = null;
    this.revealElements = [];

    this.init();
  }

  init() {
    this.bindElements();
    this.bindEvents();
    this.handleScroll();
    this.initReveal();
  }

  bindElements() {
    this.nav = document.querySelector(".nav");
    this.navToggle = document.querySelector(".nav-toggle");
    this.navMobile = document.querySelector(".nav-mobile");
    this.navClose = this.navMobile ? this.navMobile.querySelector(".nav-mobile-close") : null;
    this.scrollProgress = document.querySelector(".nav-scroll-progress");

    this.revealElements = document.querySelectorAll(".reveal-up, .reveal-left, .reveal-right");
  }

  bindEvents() {
    if (this.navToggle && this.navMobile) {
      this.navToggle.addEventListener("click", () => this.openMobileMenu());
      this.navToggle.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") this.openMobileMenu();
      });
    }

    if (this.navClose) {
      this.navClose.addEventListener("click", () => this.closeMobileMenu());
    }

    if (this.navMobile) {
      this.navMobile.addEventListener("click", (e) => {
        if (e.target.classList.contains("nav-mobile")) this.closeMobileMenu();
      });
    }

    document.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link && this.navMobile && this.navMobile.classList.contains("is-open")) {
        this.closeMobileMenu();
      }
    });

    window.addEventListener("scroll", this.handleScrollBound = this.handleScroll.bind(this));
    window.addEventListener("load", () => this.initReveal());

    if ("IntersectionObserver" in window) {
      this.revealObserver = new IntersectionObserver(
        (entries) => this.revealOnScroll(entries),
        { threshold: 0.08 }
      );
      this.revealElements.forEach((el) => this.revealObserver.observe(el));
    }
  }

  openMobileMenu() {
    this.navMobile.classList.add("is-open");
    this.navToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    this.navToggle.classList.add("is-open");
  }

  closeMobileMenu() {
    this.navMobile.classList.remove("is-open");
    this.navToggle.setAttribute("aria-expanded", "false");
    this.navToggle.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  handleScroll() {
    if (this.nav) {
      const scrolled = window.scrollY > 80;
      this.nav.classList.toggle("is-scrolled", scrolled);
    }
    if (this.scrollProgress) {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      this.scrollProgress.style.width = Math.max(0, Math.min(100, scrollPercent)) + "%";
    }
  }

  revealOnScroll(entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        this.revealObserver.unobserve(entry.target);
      }
    });
  }

  initReveal() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      this.revealElements.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    if ("IntersectionObserver" in window) {
      this.revealElements.forEach((el) => {
        if (this.isInViewport(el)) el.classList.add("is-visible");
      });
    }
  }

  isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return rect.top <= window.innerHeight * 0.85;
  }
}

/* ---- Smooth anchor scroll ---- */
document.addEventListener("click", (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const target = document.querySelector(link.getAttribute("href"));
  if (!target) return;

  e.preventDefault();
  const offset = target.offsetTop - 80;
  window.scrollTo({ top: offset, behavior: "smooth" });
});

/* ---- Initialize ---- */
document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.classList.remove("no-js");
  window.archiveApp = new ArchiveApp();
});
