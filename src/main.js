import { setupMusic } from './music.js';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const main = document.querySelector('main');
const cover = document.querySelector('.invitation-cover');
const envelope = document.querySelector('.envelope');
let opened = false;
let toastTimer;

function toast(message) {
  const target = document.querySelector('.toast');
  target.textContent = message;
  target.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => target.classList.remove('visible'), 4500);
}

const music = setupMusic({
  audio: document.querySelector('#wedding-music'),
  toggle: document.querySelector('#sound-control'),
  volume: document.querySelector('#music-volume'),
  label: document.querySelector('#sound-label'),
  output: document.querySelector('#volume-value'),
  notify: toast,
});

document.querySelector('.open-envelope').addEventListener('click', async (event) => {
  if (opened) return;
  opened = true;
  event.currentTarget.disabled = true;
  envelope.classList.add('is-open');
  cover.classList.add('unsealing');
  document.querySelector('.envelope-prompt').textContent = 'Your next adventure is unfolding…';
  setTimeout(async () => {
    // Transfer the paper at its exact on-screen position. It remains visible
    // as it grows into the centered letter instead of fading into a new card.
    const paperBounds = envelope.querySelector('.letter').getBoundingClientRect();
    const letterStage = document.querySelector('.letter-stage');
    letterStage.hidden = false;
    const centeredLetter = letterStage.querySelector('.centered-letter');
    const centerBounds = centeredLetter.getBoundingClientRect();
    const offsetX = paperBounds.left + paperBounds.width / 2 - (centerBounds.left + centerBounds.width / 2);
    const offsetY = paperBounds.top + paperBounds.height / 2 - (centerBounds.top + centerBounds.height / 2);
    const movingPaper = reducedMotion.matches ? null : centeredLetter.animate([
      { transform: `translate(${offsetX}px, ${offsetY}px) scale(${paperBounds.width / centerBounds.width}, ${paperBounds.height / centerBounds.height})`, boxShadow: '0 8px 20px #57362c18' },
      { transform: 'translate(0, 0) scale(1, 1)', boxShadow: '0 24px 70px #57362c25' },
    ], { duration: 1800, easing: 'cubic-bezier(.22,1,.36,1)' });
    if (!reducedMotion.matches) for (const element of centeredLetter.children) {
      element.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 1000, delay: 150, easing: 'ease-out', fill: 'backwards',
      });
    }
    cover.classList.add('reading-letter');
    for (const element of cover.children) if (element !== letterStage) {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    }
    if (movingPaper) await movingPaper.finished.catch(() => {});
    const continueButton = document.querySelector('#begin-adventure');
    continueButton.disabled = false;
    continueButton.focus({ preventScroll: true });
  }, reducedMotion.matches ? 0 : 1200);
});

document.querySelector('#begin-adventure').addEventListener('click', (event) => {
  void music.play();
  event.currentTarget.disabled = true;
  document.body.classList.add('entered');
  main.inert = false;
  cover.classList.add('departing');
  cover.inert = true;
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
  setTimeout(() => cover.hidden = true, reducedMotion.matches ? 0 : 1500);
});

const observer = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    entry.target.classList.add('visible');
    observer.unobserve(entry.target);
  }
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(element => observer.observe(element));

const scenes = [...document.querySelectorAll('.scene')];
let pendingFrame = false;
function renderScroll() {
  pendingFrame = false;
  const height = window.innerHeight;
  const available = document.documentElement.scrollHeight - height;
  document.documentElement.style.setProperty('--progress', available > 0 ? Math.min(1, window.scrollY / available) : 0);
  let chapter = '01';
  for (const scene of scenes) {
    const rect = scene.getBoundingClientRect();
    if (rect.top < height * 0.5) chapter = scene.dataset.chapter;
    if (!reducedMotion.matches && rect.bottom >= 0 && rect.top <= height) scene.style.setProperty('--scene-progress', Math.max(-1, Math.min(1, -rect.top / rect.height)));
  }
  const number = document.querySelector('#chapter-number');
  if (number.textContent !== chapter) number.textContent = chapter;
}
function scheduleScroll() { if (!pendingFrame) { pendingFrame = true; requestAnimationFrame(renderScroll); } }
window.addEventListener('scroll', scheduleScroll, { passive: true });
window.addEventListener('resize', scheduleScroll);
renderScroll();

for (let i = 0; i < 36; i++) {
  const leaf = document.createElement('span');
  leaf.className = 'leaf';
  leaf.style.left = `${(i * 29 + 5) % 100}%`;
  leaf.style.animationDelay = `${-i * 2.7}s`;
  leaf.style.animationDuration = `${18 + i % 5 * 3}s`;
  leaf.style.width = `${8 + i % 5 * 2}px`;
  leaf.style.height = `${16 + i % 5 * 3}px`;
  leaf.style.opacity = `${0.45 + i % 4 * 0.15}`;
  document.querySelector('.floating-leaves').append(leaf);
}

const weddingTime = new Date('2026-12-18T15:00:00+08:00').getTime();
function countdown() {
  const remaining = Math.max(0, weddingTime - Date.now());
  document.querySelector('#days').textContent = Math.floor(remaining / 86400000).toString().padStart(2, '0');
  document.querySelector('#hours').textContent = Math.floor(remaining / 3600000 % 24).toString().padStart(2, '0');
  document.querySelector('#minutes').textContent = Math.floor(remaining / 60000 % 60).toString().padStart(2, '0');
  if (!remaining) document.querySelector('.countdown-note').textContent = 'our forever has begun';
}
countdown();
setInterval(countdown, 30000);

document.querySelector('#save-date').addEventListener('click', () => {
  const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Gerald and Girlie//Wedding//EN','BEGIN:VEVENT','UID:gerald-girlie-20261218@wedding.local','DTSTAMP:20261001T000000Z','DTSTART:20261218T070000Z','SUMMARY:Gerald & Girlie’s Wedding','LOCATION:ICCM\\, Antipolo City\\, Rizal','DESCRIPTION:Celebrate the wedding of Gerald and Girlie. Ceremony begins at 3 PM Philippine time.','END:VEVENT','END:VCALENDAR',''].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'gerald-and-girlie-wedding.ics'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Your calendar invitation is ready to save.');
});

const dialog = document.querySelector('#photo-dialog');
document.querySelectorAll('.note').forEach(note => note.addEventListener('toggle', () => {
  if (note.open && !reducedMotion.matches) note.querySelector('p').animate([
    { opacity: 0, translate: '0 -8px' },
    { opacity: 1, translate: '0 0' },
  ], { duration: 350, easing: 'cubic-bezier(.22,1,.36,1)' });
}));
let photoTrigger;
document.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', () => {
  photoTrigger = button;
  document.querySelector('#full-photo').src = button.dataset.photo;
  document.querySelector('#full-photo').alt = button.querySelector('img')?.alt || button.textContent.trim();
  dialog.showModal();
  document.body.classList.add('photo-open');
}));
function closePhoto() { dialog.close(); }
document.querySelector('#close-photo').addEventListener('click', closePhoto);
dialog.addEventListener('click', event => { if (event.target === dialog) closePhoto(); });
dialog.addEventListener('close', () => {
  document.body.classList.remove('photo-open');
  photoTrigger?.focus({ preventScroll: true });
});
function scrollToTop() { window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' }); }
document.querySelector('#back-start').addEventListener('click', scrollToTop);
document.querySelector('#scroll-top').addEventListener('click', scrollToTop);

async function revealStyledInvitation() {
  // The head stylesheet links block the first render. Keep the critical loader
  // in place until both stylesheets and the invitation font are ready as well.
  const styles = [...document.querySelectorAll('link[rel="stylesheet"]')];
  try {
    await Promise.all(styles.map(link => link.sheet ? Promise.resolve() : new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Stylesheet loading timed out')), 15000);
      link.addEventListener('load', () => { clearTimeout(timeout); resolve(); }, { once: true });
      link.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Stylesheet unavailable')); }, { once: true });
    })));
    await Promise.race([
      document.fonts.load('400 32px Garamond').catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 4000)),
    ]);
    requestAnimationFrame(() => {
      clearTimeout(window.invitationLoadingTimeout);
      cover.inert = false;
      document.documentElement.classList.remove('app-loading');
      const loader = document.querySelector('.page-loader');
      loader.classList.add('is-leaving');
      setTimeout(() => { loader.hidden = true; }, reducedMotion.matches ? 0 : 450);
    });
  } catch {
    clearTimeout(window.invitationLoadingTimeout);
    document.querySelector('.loader-message').textContent = 'Your invitation could not load. Please try again.';
    document.querySelector('.loader-retry').hidden = false;
  }
}
void revealStyledInvitation();
