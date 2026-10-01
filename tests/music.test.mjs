import test from 'node:test';
import assert from 'node:assert/strict';
import { setupMusic } from '../src/music.js';

class Control extends EventTarget {
  value = '100'; textContent = ''; disabled = true;
  attributes = new Map();
  classList = { toggle() {} };
  setAttribute(key, value) { this.attributes.set(key, value); }
  removeAttribute(key) { this.attributes.delete(key); }
}
function fixture(playImplementation) {
  const audio = new Control();
  audio.paused = true; audio.readyState = 0; audio.volume = 1;
  audio.play = playImplementation || (() => { audio.paused = false; return Promise.resolve(); });
  audio.pause = () => { audio.paused = true; audio.dispatchEvent(new Event('pause')); };
  audio.load = () => {};
  const toggle = new Control(), volume = new Control(), label = new Control(), output = new Control();
  const messages = [];
  const player = setupMusic({ audio, toggle, volume, label, output, notify: message => messages.push(message) });
  return { audio, toggle, volume, label, output, messages, player };
}
test('calls playback immediately without waiting for a network readiness check', async () => {
  let called = false;
  const instance = fixture(() => { called = true; return Promise.resolve(); });
  const playback = instance.player.play();
  assert.equal(called, true);
  assert.equal(instance.volume.disabled, false);
  await playback;
});
test('autoplay rejection leaves a working manual retry control', async () => {
  const instance = fixture(() => Promise.reject(Object.assign(new Error(), { name: 'NotAllowedError' })));
  await instance.player.play(true);
  assert.equal(instance.label.textContent, 'Music off');
  assert.equal(instance.toggle.attributes.get('aria-label'), 'Play keyboard instrumental');
  assert.equal(instance.messages.length, 1);
  instance.audio.play = () => { instance.audio.paused = false; return Promise.resolve(); };
  await instance.player.play();
  assert.equal(instance.label.textContent, 'Music on');
});
test('volume adjustment updates audio without restarting or pausing playback', async () => {
  const instance = fixture();
  await instance.player.play();
  instance.volume.value = '0'; instance.volume.dispatchEvent(new Event('input'));
  assert.equal(instance.audio.volume, 0);
  assert.equal(instance.label.textContent, 'Music muted');
  assert.equal(instance.audio.paused, false);
  instance.volume.value = '65'; instance.volume.dispatchEvent(new Event('input'));
  assert.equal(instance.audio.volume, .65);
  assert.equal(instance.output.textContent, '65%');
});
test('starts at full volume and allows the guest to pause', async () => {
  const instance = fixture();
  await instance.player.play();
  assert.equal(instance.audio.volume, 1);
  instance.toggle.dispatchEvent(new Event('click'));
  assert.equal(instance.audio.paused, true);
});
test('loading failure offers retry rather than leaving music unavailable', async () => {
  const instance = fixture(() => Promise.reject(Object.assign(new Error(), { name: 'NotSupportedError' })));
  await instance.player.play(true);
  assert.equal(instance.label.textContent, 'Retry music');
  assert.equal(instance.toggle.attributes.get('aria-busy'), 'false');
});
