import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import yaml from 'js-yaml';
import { parseProject, readProjects, build, ROOT } from '../scripts/build.mjs';
import '../assets/project-content.js';

const fixture = extra => ({ id: 'casa', titlePT: 'Casa', published: true, pageEnabled: true, ...extra });
const frontmatter = data => `---\n${yaml.dump(data)}---\n`;
async function repository(t, entries) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'unna-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'projetos'));
  for (const [name, data] of Object.entries(entries)) await writeFile(path.join(root, 'projetos', `${name}.md`), frontmatter(data));
  return root;
}

test('all migrated projects load and the eight index-only entries remain available', async () => {
  const projects = await readProjects();
  assert.equal(projects.length, 24);
  assert.equal(projects.filter(p => !p.pageEnabled).length, 8);
  assert.equal(projects.find(p => p.id === 'ivens').interventionPT, 'Alteração');
  assert.equal(projects.find(p => p.id === 'azenha').locationPT, 'Porto, Portugal');
  assert(!JSON.stringify(projects).includes('Texto temporário'));
  assert(!JSON.stringify(projects).includes('contentStatus'));
});

test('invalid identifiers, duplicate IDs and malformed records stop publication', async t => {
  for (const id of ['home', 'about', 'projetos', 'Casa Nova', '../x']) {
    assert.throws(() => parseProject(frontmatter(fixture({ id })), 'test.md'), /identificador/);
  }
  assert.throws(() => parseProject(frontmatter(fixture({ published: 'false' })), 'test.md'), /published/);
  assert.throws(() => parseProject('not yaml', 'test.md'), /cabeçalho/);
  assert.throws(() => parseProject(frontmatter(fixture({ titlePT: '' })), 'test.md'), /nome/);
  const root = await repository(t, { first: fixture(), second: fixture() });
  await assert.rejects(readProjects(root), /duplicado/);
});

test('drafts are excluded, new projects appear, edits and deletes are reflected without a manual list', async t => {
  const root = await repository(t, { draft: fixture({ published: false }) });
  assert.deepEqual(await readProjects(root), []);
  await writeFile(path.join(root, 'projetos/draft.md'), frontmatter(fixture({ titlePT: 'Nova casa' })));
  assert.equal((await readProjects(root))[0].titlePT, 'Nova casa');
  await rm(path.join(root, 'projetos/draft.md'));
  assert.deepEqual(await readProjects(root), []);
});

test('gallery order, captions and first-image fallback are preserved; missing images fail clearly', async t => {
  const root = await repository(t, { casa: fixture({ images: [
    { image: '/images/second.jpg', altPT: 'Fachada' }, { image: '/images/first.jpg' }
  ] }) });
  await assert.rejects(readProjects(root), /imagem não encontrada/);
  await mkdir(path.join(root, 'images'));
  await writeFile(path.join(root, 'images/first.jpg'), 'image fixture');
  await writeFile(path.join(root, 'images/second.jpg'), 'image fixture');
  const [p] = await readProjects(root);
  assert.equal(p.coverImage, '/images/second.jpg');
  assert.equal(p.images[0].altPT, 'Fachada');
  assert.deepEqual(p.images.map(i => i.image), ['/images/second.jpg', '/images/first.jpg']);
  await writeFile(path.join(root, 'projetos/casa.md'), frontmatter(fixture({ coverImage: '/images/../../secret' })));
  await assert.rejects(readProjects(root), /caminho de imagem inválido/);
});

test('plain text is escaped and missing English fields fall back to Portuguese', () => {
  const { translated, descriptionHTML, detailsHTML, imageURL } = globalThis.ProjectContent;
  assert.equal(translated({ titlePT: 'Casa' }, 'title', 'en'), 'Casa');
  assert.equal(descriptionHTML('Um\n\nDois'), '<p>Um</p><p>Dois</p>');
  assert(!descriptionHTML('<script>alert(1)</script>').includes('<script>'));
  assert(detailsHTML({ architect: '<img src=x onerror=alert(1)>' }, 'pt').includes('&lt;img'));
  assert.equal(imageURL('/images/casa.jpg', 'https://example.com/unn-a-site/'), 'https://example.com/unn-a-site/images/casa.jpg');
  assert.equal(imageURL('/unn-a-site/images/casa.jpg', 'https://example.com/'), 'https://example.com/images/casa.jpg');
  assert.equal(imageURL('javascript:alert(1)', 'https://example.com/'), '');
});

test('the CMS can edit every existing project field without losing metadata', async () => {
  const config = yaml.load(await readFile(path.join(ROOT, 'admin/config.yml'), 'utf8'));
  const fields = new Set(config.collections[0].fields.map(f => f.name));
  const { readdir } = await import('node:fs/promises');
  for (const name of await readdir(path.join(ROOT, 'projetos'))) {
    const data = parseProject(await readFile(path.join(ROOT, 'projetos', name), 'utf8'), name);
    for (const field of Object.keys(data)) assert(fields.has(field), `${name}: field ${field} missing from CMS`);
  }
  assert.equal(config.collections[0].fields.find(f => f.name === 'published').default, false);
});

test('build publishes only the public surface, not source files or unrelated root files', async t => {
  const root = await repository(t, { casa: fixture() });
  for (const dir of ['images', 'assets', 'admin']) await mkdir(path.join(root, dir));
  await writeFile(path.join(root, 'index.html'), '<html></html>');
  await writeFile(path.join(root, 'passid.txt'), 'not-for-publication');
  await writeFile(path.join(root, 'images/.temporary'), 'not-for-publication');
  await build(root);
  assert.equal(JSON.parse(await readFile(path.join(root, 'dist/data/projects.json'))).length, 1);
  for (const name of ['passid.txt', 'projetos', 'images/.temporary']) {
    await assert.rejects(access(path.join(root, 'dist', name)));
  }
});
