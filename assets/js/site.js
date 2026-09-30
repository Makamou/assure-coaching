// Assure Coaching — small progressive enhancements. The site works without JS.
document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header: shadow once the page scrolls */
  const header = document.querySelector(".site-header");
  const onScroll = () => header && header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile navigation */
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    const setOpen = (open, returnFocus) => {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      toggle.querySelector(".nav-toggle-label").textContent = open ? "Close" : "Menu";
      if (open) nav.querySelector("a")?.focus();
      else if (returnFocus) toggle.focus();
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) setOpen(false, true);
    });
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("click", (e) => {
      if (nav.classList.contains("is-open") && !e.target.closest(".site-header")) setOpen(false);
    });
    window.matchMedia("(min-width: 1081px)").addEventListener("change", (m) => { if (m.matches) setOpen(false); });
  }

  /* About page: highlight the current story chapter */
  const chapterLinks = [...document.querySelectorAll(".story-nav a")];
  if (chapterLinks.length && "IntersectionObserver" in window) {
    const byId = new Map(chapterLinks.map((a) => [a.hash.slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          chapterLinks.forEach((a) => a.classList.remove("is-active"));
          byId.get(entry.target.id)?.classList.add("is-active");
        }
      });
    }, { rootMargin: "-35% 0px -55% 0px" });
    byId.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* Video: load the player only when the visitor asks for it */
  document.querySelectorAll(".video[data-embed]").forEach((box) => {
    const btn = box.querySelector(".video-play");
    btn?.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      const url = new URL(box.dataset.embed);
      url.searchParams.set("autoplay", "true");
      url.searchParams.set("preload", "true");
      iframe.src = url.toString();
      iframe.title = "Awaken To Your Life’s Purpose — introduction video";
      iframe.allow = "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture";
      iframe.allowFullscreen = true;
      box.replaceChildren(iframe);
      iframe.focus();
    });
  });

  /* Discovery call: qualifying self-check (nothing is stored or sent) */
  const qualify = document.getElementById("qualify");
  const qStatus = document.getElementById("qualify-status");
  if (qualify && qStatus) {
    const boxes = [...qualify.querySelectorAll("input[type=checkbox]")];
    const booking = document.querySelector('a[href*="discovery-call-consultation"]')?.href;
    qualify.addEventListener("change", () => {
      const n = boxes.filter((b) => b.checked).length;
      qStatus.classList.toggle("is-qualified", n >= 5);
      if (n === 0) qStatus.textContent = "Tick each statement that’s true for you. Nothing is saved or sent.";
      else if (n < 5) qStatus.textContent = `${n} of 7 statements are true for you. Five or more qualifies you for a complimentary call.`;
      else {
        qStatus.textContent = `${n} of 7: you qualify for a complimentary discovery call. `;
        if (booking) {
          const a = document.createElement("a");
          a.href = booking;
          a.textContent = "Choose a time now →";
          qStatus.append(a);
        }
      }
    });
  }

  /* Contact form: validate, then send to the configured endpoint or email */
  const form = document.getElementById("contact-form");
  if (form) {
    const status = document.getElementById("form-status");
    const fields = {
      name: { el: form.elements.name, ok: (v) => v.trim().length > 0 },
      email: { el: form.elements.email, ok: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) },
      message: { el: form.elements.message, ok: (v) => v.trim().length > 0 },
    };
    const validate = () => {
      let first = null;
      for (const [, f] of Object.entries(fields)) {
        const valid = f.ok(f.el.value);
        const err = document.getElementById(`${f.el.id}-error`);
        f.el.setAttribute("aria-invalid", String(!valid));
        if (err) {
          err.hidden = valid;
          if (!valid) f.el.setAttribute("aria-describedby", err.id); else f.el.removeAttribute("aria-describedby");
        }
        if (!valid && !first) first = f.el;
      }
      return first;
    };
    Object.values(fields).forEach((f) => f.el.addEventListener("blur", () => { if (f.el.getAttribute("aria-invalid") === "true") validate(); }));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.className = "form-status";
      const invalid = validate();
      if (invalid) {
        status.textContent = "Please fix the highlighted fields.";
        status.classList.add("is-error");
        invalid.focus();
        return;
      }
      const data = new FormData(form);
      const endpoint = form.dataset.endpoint;
      const button = form.querySelector("button[type=submit]");
      if (endpoint) {
        button.disabled = true;
        status.textContent = "Sending…";
        try {
          const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error(String(res.status));
          form.reset();
          status.textContent = "Thank you. Your message was sent, and Henry will be in touch soon.";
          status.classList.add("is-ok");
        } catch {
          status.innerHTML = `Your message couldn’t be sent just now. Please try again, or email <a href="mailto:${form.dataset.mailto}">${form.dataset.mailto}</a>.`;
          status.classList.add("is-error");
        } finally {
          button.disabled = false;
        }
        return;
      }
      // No form service configured: open the visitor's email app with the message ready.
      const body = [
        data.get("message"),
        "",
        `Name: ${data.get("name")}`,
        `Email: ${data.get("email")}`,
        data.get("phone") ? `Phone: ${data.get("phone")}` : "",
        data.get("country") ? `Country: ${data.get("country")}` : "",
        `Preferred contact: ${data.get("preference")}`,
      ].filter((l) => l !== null).join("\n");
      const subject = `Message from ${data.get("name")} via assurecoaching.online`;
      window.location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.textContent = "Your email app should open with your message ready to send. If it doesn’t, email henry@assurecoaching.online directly.";
      status.classList.add("is-ok");
    });
  }

  if (reduceMotion) document.documentElement.classList.add("reduce-motion");
});
