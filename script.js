/* =============================================
   Exact chandru.page Framer Motion animations
   replicated in vanilla JS + EmailJS + Supabase
   ============================================= */

// ── EmailJS (fill in your keys from emailjs.com) ─────────────
const EMAILJS_SERVICE_ID = 'service_mhbg59g';
const EMAILJS_TEMPLATE_ID = 'template_mn6shlh';
const EMAILJS_PUBLIC_KEY = 'FLDm9TXqTxN0s7SR7';
if (typeof emailjs !== 'undefined') emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

// ── Supabase (fill in from supabase.com > Settings > API) ────
const SUPABASE_URL = 'https://jgdenpctvatjjftajtap.supabase.co.';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnZGVucGN0dmF0ampmdGFqdGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjcxOTgsImV4cCI6MjA5NTkwMzE5OH0.x_y8nMFrNuZ7g-MJzgnXTJaa5MppiEWgOjP7rJWU8Uk';
async function saveToSupabase(name, email, message) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/contact_messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ name, email, message })
    });
  } catch (_) { }
}

// ── Year ──────────────────────────────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();

// ── HoverText: each letter, transition:"all 2s cubic-bezier(0.25,0.1,0.25,1)"
//    hover: text-primary + drop-shadow  (exact from HeroSection.tsx)
document.querySelectorAll('.hover-text').forEach(el => {
  el.innerHTML = el.textContent.split('').map(ch =>
    ch === ' '
      ? '<span class="letter-span" style="-webkit-text-fill-color:inherit">&nbsp;</span>'
      : `<span class="letter-span">${ch}</span>`
  ).join('');
});

// ── Hero cursor-following yellow glow ─────────────────────────
const hero = document.querySelector('.hero');
const cursorGlow = document.getElementById('cursorGlow');
if (hero && cursorGlow) {
  hero.addEventListener('mouseenter', () => cursorGlow.style.opacity = '1');
  hero.addEventListener('mouseleave', () => cursorGlow.style.opacity = '0');
  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    cursorGlow.style.left = (e.clientX - r.left) + 'px';
    cursorGlow.style.top = (e.clientY - r.top) + 'px';
  });
}

// ── Role switcher — exact AnimatePresence mode="wait"
//    enter: y:40→0 opacity:0→1  exit: y:-40 opacity:0  duration:0.5s easeInOut
const roles = [
  'Full Stack Developer 🚀',
  'AI/ML Enthusiast 🧠',
  'Tech Lead ⚡',
  'Problem Solver 🧩',
  'Open Source Contributor 🌐'
];
let roleIdx = 0;
const roleSlider = document.querySelector('.role-slider');
function switchRole() {
  const cur = roleSlider.querySelector('.role-slide.active');
  if (!cur) return;
  cur.classList.replace('active', 'exiting');
  setTimeout(() => cur.remove(), 500);
  roleIdx = (roleIdx + 1) % roles.length;
  const next = document.createElement('span');
  next.className = 'role-slide entering';
  next.textContent = roles[roleIdx];
  roleSlider.appendChild(next);
  requestAnimationFrame(() => requestAnimationFrame(() =>
    next.classList.replace('entering', 'active')
  ));
}
setInterval(switchRole, 2500);

// ── whileInView scroll reveal — exact values from source:
//    wiv-fade:  y:20→0, opacity, duration:0.6s, ease
//    wiv-left:  x:-30→0, opacity, duration:0.6s
//    wiv-right: x:30→0, opacity, duration:0.6s
//    wiv-card:  y:40 scale:0.95→1, spring, staggered by data-i * 150ms
//    viewport: once:true, margin:"-50px"
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;

    if (el.classList.contains('wiv-card')) {
      // Stagger by data-i index — delay = i * 150ms (from source: index * 0.15)
      const i = parseInt(el.dataset.i || '0');
      setTimeout(() => el.classList.add('wiv-in'), i * 150);
    } else {
      el.classList.add('wiv-in');
    }
    revealObserver.unobserve(el);
  });
}, { threshold: 0.1, rootMargin: '-50px' });

document.querySelectorAll('.wiv-fade, .wiv-left, .wiv-right, .wiv-card')
  .forEach(el => revealObserver.observe(el));

// ── Navbar: scrolled state + active link ─────────────────────
const navbar = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
  let cur = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 160) cur = s.id; });
  navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + cur));
}, { passive: true });

// ── Project card 3D tilt — whileHover: y:-8 scale:1.02 + rotateX/Y
const projGrid = document.querySelector('.proj-grid');
if (projGrid) projGrid.style.perspective = '1200px';
document.querySelectorAll('.proj-card').forEach(card => {
  card.addEventListener('mouseenter', () =>
    card.style.transition = 'transform 0.1s ease, border-color 0.3s, box-shadow 0.3s');
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `translateY(-8px) scale(1.02) rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), border-color 0.3s, box-shadow 0.3s';
    card.style.transform = '';
  });
});

// ── Contact form → EmailJS (primary) + Supabase (backup) ─────
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    if (!name || !email || !message) return;

    const btn = document.getElementById('submitBtn');
    const success = document.getElementById('formSuccess');
    const errMsg = document.getElementById('formError');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;
    success.style.display = 'none';
    errMsg.style.display = 'none';

    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        from_name: name,
        from_email: email,
        message: message,
        to_email: 'rithwikreddy1029@gmail.com',
        reply_to: email
      });
      saveToSupabase(name, email, message); // backup, non-blocking
      form.reset();
      success.style.display = 'flex';
      success.style.opacity = '0';
      success.style.transition = 'opacity 0.4s';
      requestAnimationFrame(() => success.style.opacity = '1');
    } catch (err) {
      console.error(err);
      errMsg.style.display = 'flex';
    } finally {
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
      btn.disabled = false;
    }
  });
}
