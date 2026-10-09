import { setupMusic } from './music.js';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const main = document.querySelector('main');
const cover = document.querySelector('.invitation-cover');
const journal = document.querySelector('.journal');
// Every sheet has separate front and back faces so it stays solid as it turns.
for (let page = 15; page >= 0; page--) {
  const sheet = document.createElement('div');
  sheet.className = 'journal-leaf';
  sheet.setAttribute('aria-hidden', 'true');
  sheet.style.setProperty('--page', page);
  sheet.style.setProperty('--depth', `${18 - page}px`);
  for (const side of ['front', 'back']) {
    const face = document.createElement('div');
    face.className = `journal-sheet-face sheet-${side}`;
    const number = document.createElement('span');
    number.textContent = String(page * 2 + (side === 'front' ? 1 : 2)).padStart(2, '0');
    face.append(number);
    sheet.append(face);
  }
  journal.insertBefore(sheet, journal.querySelector('.journal-front'));
}
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

document.querySelector('.open-journal').addEventListener('click', event => {
  if (opened) return;
  opened = true;
  event.currentTarget.disabled = true;
  journal.classList.add('is-open');
  cover.classList.add('opening-journal');
  document.querySelector('.journal-prompt').textContent = 'Your next chapter is unfolding…';
  const openingDelay = reducedMotion.matches ? 1000 : 4600;
  if (!reducedMotion.matches) setTimeout(() => cover.classList.add('approaching'), 2200);
  music.startAfter(openingDelay);
  setTimeout(() => {
    document.body.classList.add('entered');
    main.inert = false;
    cover.classList.add('departing');
    cover.inert = true;
    main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => { cover.hidden = true; }, reducedMotion.matches ? 0 : 1600);
  }, openingDelay);
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
  document.querySelector('#seconds').textContent = Math.floor(remaining / 1000 % 60).toString().padStart(2, '0');
  if (!remaining) document.querySelector('.countdown-note').textContent = 'our forever has begun';
}
countdown();
setInterval(countdown, 1000);

const dialog = document.querySelector('#photo-dialog');
const notes = [...document.querySelectorAll('.note')];
const noteStates = new Map(notes.map(note => [note, { expanded: note.open, animation: null, fade: null }]));
function animateNote(note, expanded) {
  const state = noteStates.get(note);
  if (state.expanded === expanded) return;
  const startHeight = note.getBoundingClientRect().height;
  const paragraph = note.querySelector('p');
  const startOpacity = note.open ? getComputedStyle(paragraph).opacity : '0';
  state.animation?.cancel();
  state.fade?.cancel();
  state.expanded = expanded;
  note.classList.toggle('is-expanded', expanded);
  note.querySelector('summary').setAttribute('aria-expanded', String(expanded));
  if (reducedMotion.matches) {
    note.open = expanded;
    note.style.height = '';
    return;
  }
  // Keep the details open while retracting so its content can slide away.
  note.open = true;
  note.style.height = '';
  const style = getComputedStyle(note);
  const targetHeight = expanded ? note.getBoundingClientRect().height
    : note.querySelector('summary').getBoundingClientRect().height + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
  note.style.height = `${startHeight}px`;
  const animation = note.animate([{ height: `${startHeight}px` }, { height: `${targetHeight}px` }], {
    duration: 450, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards',
  });
  state.animation = animation;
  state.fade = paragraph.animate([{ opacity: startOpacity }, { opacity: expanded ? 1 : 0 }], {
    duration: expanded ? 380 : 220, easing: 'ease-out', fill: 'forwards',
  });
  animation.finished.then(() => {
    if (state.animation !== animation) return;
    note.open = expanded;
    note.style.height = '';
    animation.cancel();
    state.fade?.cancel();
    state.animation = null;
    state.fade = null;
  }).catch(() => {});
}
for (const note of notes) {
  const summary = note.querySelector('summary');
  note.classList.add('animated-note');
  note.classList.toggle('is-expanded', note.open);
  summary.setAttribute('aria-expanded', String(note.open));
  summary.addEventListener('click', event => {
    event.preventDefault();
    const expanded = !noteStates.get(note).expanded;
    if (expanded) for (const other of notes) if (other !== note) animateNote(other, false);
    animateNote(note, expanded);
  });
}
let photoTrigger;
let photoRequest = 0;
document.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', () => {
  photoTrigger = button;
  const request = ++photoRequest;
  const thumbnail = button.querySelector('img');
  // Replace the node before opening: changing src on the old node can leave
  // its last decoded picture visible while the next picture downloads.
  const preview = document.createElement('img');
  preview.id = 'full-photo';
  preview.alt = thumbnail?.alt || button.textContent.trim();
  const frameStyle = thumbnail && getComputedStyle(thumbnail);
  const frameRatio = thumbnail ? parseFloat(frameStyle.width) / parseFloat(frameStyle.height) : null;
  dialog.classList.toggle('framed-photo', !!thumbnail);
  dialog.style.setProperty('--photo-ratio', frameRatio || 1);
  dialog.style.setProperty('--photo-width', frameRatio ? `min(88vw, calc(82svh * ${frameRatio}))` : 'auto');
  dialog.style.setProperty('--photo-position', frameStyle?.objectPosition || '50% 50%');
  if (thumbnail) preview.src = thumbnail.currentSrc || thumbnail.src;
  document.querySelector('#full-photo').replaceWith(preview);
  dialog.querySelector('.photo-loading-label').textContent = 'Loading image…';
  dialog.classList.toggle('photo-loading', !thumbnail);
  dialog.showModal();
  document.body.classList.add('photo-open');
  // The cached frame picture is visible immediately. Swap in the larger
  // picture only after decoding it, and ignore requests from closed viewers.
  const full = new Image();
  full.id = 'full-photo';
  full.alt = preview.alt;
  full.onload = async () => {
    await full.decode().catch(() => {});
    if (request !== photoRequest || !dialog.open) return;
    preview.replaceWith(full);
    dialog.classList.remove('photo-loading');
  };
  full.onerror = () => {
    if (request !== photoRequest || !dialog.open) return;
    if (!thumbnail) {
      dialog.classList.add('photo-loading');
      dialog.querySelector('.photo-loading-label').textContent = 'Image could not load. Close and try again.';
    }
  };
  full.src = button.dataset.photo;
}));
function closePhoto() { dialog.close(); }
document.querySelector('#close-photo').addEventListener('click', closePhoto);
dialog.addEventListener('click', event => { if (event.target === dialog) closePhoto(); });
dialog.addEventListener('close', () => {
  photoRequest++;
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
