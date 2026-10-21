import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { readProjects } from '../scripts/build.mjs';

const wait = () => new Promise(resolve => setTimeout(resolve, 30));
async function site(t, hash, fetcher) {
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', error => errors.push(error.message));
  const helper = await readFile(new URL('../assets/project-content.js', import.meta.url), 'utf8');
  const html = (await readFile(new URL('../index.html', import.meta.url), 'utf8'))
    .replace(/<script src="https:[^>]+><\/script>/g, '')
    .replace(/<link[^>]+>/g, '')
    .replace('<script src="assets/project-content.js"></script>', () => `<script>${helper}</script>`);
  const dom = new JSDOM(html, { url: `https://example.com/unn-a-site/${hash}`, runScripts: 'dangerously', virtualConsole: console,
    beforeParse(window) { window.fetch = fetcher; window.scrollTo = () => {}; window.requestAnimationFrame = () => 0; }
  });
  t.after(() => { dom.window.close(); assert.deepEqual(errors, []); });
  await wait();
  return dom.window;
}

test('direct project links, translation, metadata, gallery and index work together', async t => {
  const data = await readProjects();
  const window = await site(t, '#ivens', async () => ({ ok: true, json: async () => data }));
  const doc = window.document;
  assert.equal(doc.querySelector('h1').textContent, 'Ivens');
  assert(doc.querySelector('.project-details').textContent.includes('Matosinhos, Portugal'));
  assert.equal(doc.querySelectorAll('.project-gallery img').length, 4);
  assert(doc.querySelector('.project-gallery img').src.includes('/unn-a-site/images/ivens/'));
  doc.querySelector('#langToggle').click();
  assert.equal(doc.documentElement.lang, 'en');
  assert(doc.querySelector('.project-description').textContent.includes('alteration project'));
  window.location.hash = '#projetos'; await wait();
  assert.equal(doc.querySelectorAll('.project-row').length, 24);
  assert.equal(doc.querySelectorAll('a.project-row').length, 16);
  window.location.hash = '#antas'; await wait(); await wait();
  assert.equal(window.location.hash, '#projetos');
});

test('a failed request has a retry and does not strand a direct project link', async t => {
  let fail = true;
  const data = await readProjects();
  const window = await site(t, '#azenha', async () => fail ? { ok: false, status: 503 } : { ok: true, json: async () => data });
  assert(window.document.querySelector('.retry-button'));
  fail = false;
  window.document.querySelector('.retry-button').click(); await wait();
  assert.equal(window.document.querySelector('h1').textContent, 'Azenha');
  assert.equal(window.location.hash, '#azenha');
});
