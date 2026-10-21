import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, readProjects } from './build.mjs';

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.yml': 'text/yaml', '.json': 'application/json', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    res.setHeader('Cache-Control', 'no-store');
    if (pathname === '/data/projects.json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(await readProjects()));
      return;
    }
    // Only serve the public surface, never credentials, sources, or dependencies.
    if (!/^\/(?:$|index\.html$|(?:admin|images|assets)\/)/.test(pathname) || pathname.split('/').some(s => s.startsWith('.'))) {
      res.writeHead(404).end(); return;
    }
    let file = path.join(ROOT, pathname);
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    res.setHeader('Content-Type', `${types[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`);
    res.end(await readFile(file));
  } catch (error) {
    res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(error.code === 'ENOENT' ? 'Não encontrado.' : error.message);
  }
});
server.listen(8080, '127.0.0.1', () => console.log('Site: http://localhost:8080 · Editor: http://localhost:8080/admin/\nPara guardar pelo editor, executar npm run cms noutro terminal.'));
