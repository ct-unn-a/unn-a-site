import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import yaml from 'js-yaml';
import { createRequire } from 'node:module';
import { readProjects } from '../scripts/build.mjs';

const require = createRequire(import.meta.url);
const { runDevServer } = require('@decap/cli/dev');

test('Decap local backend creates, edits, hides and deletes a project with media', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'unna-cms-'));
  const server = await runDevServer({ port: 0, host: '127.0.0.1', dir: root, mode: 'fs', logLevel: 'error' });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  const request = async (action, params = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params: { branch: 'main', ...params } })
    });
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    return result;
  };
  const data = { id: 'teste', titlePT: 'Teste', published: false, pageEnabled: true,
    coverImage: '/images/uploads/teste.jpg', images: [{ image: '/images/uploads/teste.jpg', altPT: 'Imagem de teste' }] };
  const save = async assets => request('persistEntry', {
    entry: { slug: 'teste', path: 'projetos/teste.md', raw: `---\n${yaml.dump(data)}---\n` },
    assets, options: { commitMessage: 'Teste local', useWorkflow: false, status: 'ready' }
  });
  await save([{ path: 'images/uploads/teste.jpg', encoding: 'base64', content: Buffer.from('test-image').toString('base64') }]);
  assert.equal((await request('entriesByFolder', { folder: 'projetos', extension: 'md', depth: 1 })).length, 1);
  assert.deepEqual(await readProjects(root), []);
  data.published = true;
  data.titlePT = 'Projeto editado';
  await save([]);
  assert.equal((await readProjects(root))[0].titlePT, 'Projeto editado');
  assert.equal(await readFile(path.join(root, 'images/uploads/teste.jpg'), 'utf8'), 'test-image');
  await request('deleteFile', { path: 'projetos/teste.md', options: { commitMessage: 'Apagar teste' } });
  assert.deepEqual(await readProjects(root), []);
});
