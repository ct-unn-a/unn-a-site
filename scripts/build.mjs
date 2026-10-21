import { readdir, readFile, mkdir, writeFile, cp, rm, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESERVED = new Set(['home', 'about', 'projetos']);
const TEXT_FIELDS = ['titlePT', 'titleEN', 'programPT', 'programEN', 'interventionPT',
  'interventionEN', 'statusPT', 'statusEN', 'year', 'metaPT', 'metaEN',
  'descriptionPT', 'descriptionEN', 'locationPT', 'locationEN', 'projectDuration',
  'completion', 'grossFloorArea', 'architect', 'projectTeam', 'photography'];

export function parseProject(text, filename) {
  const match = text.replace(/^\uFEFF/, '').match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) throw new Error(`${filename}: cabeçalho YAML em falta.`);
  const data = yaml.load(match[1], { schema: yaml.JSON_SCHEMA });
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${filename}: dados inválidos.`);
  if (typeof data.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.id) || RESERVED.has(data.id)) {
    throw new Error(`${filename}: identificador inválido ou reservado.`);
  }
  if (typeof data.titlePT !== 'string' || !data.titlePT.trim()) throw new Error(`${filename}: falta o nome do projeto.`);
  for (const key of ['published', 'pageEnabled']) {
    if (typeof data[key] !== 'boolean') throw new Error(`${filename}: ${key} deve ser verdadeiro ou falso.`);
  }
  for (const key of TEXT_FIELDS) {
    if (data[key] != null && typeof data[key] !== 'string' && !(key === 'year' && typeof data[key] === 'number')) {
      throw new Error(`${filename}: ${key} deve ser texto.`);
    }
  }
  if (data.images != null && !Array.isArray(data.images)) throw new Error(`${filename}: galeria inválida.`);
  for (const image of data.images || []) {
    if (!image || typeof image.image !== 'string') throw new Error(`${filename}: imagem inválida.`);
    for (const key of ['altPT', 'altEN']) {
      if (image[key] != null && typeof image[key] !== 'string') throw new Error(`${filename}: legenda inválida.`);
    }
  }
  return data;
}

export async function readProjects(root = ROOT) {
  const files = (await readdir(path.join(root, 'projetos'))).filter(f => f.endsWith('.md')).sort();
  const seen = new Set();
  const projects = [];
  for (const filename of files) {
    const p = parseProject(await readFile(path.join(root, 'projetos', filename), 'utf8'), filename);
    if (seen.has(p.id)) throw new Error(`${filename}: identificador duplicado: ${p.id}.`);
    seen.add(p.id);
    // Hidden projects never enter the published payload. The Git repository itself is public.
    if (!p.published) continue;
    for (const image of [p.coverImage, ...(p.images || []).map(i => i.image)].filter(Boolean)) {
      if (typeof image !== 'string' || !image.startsWith('/images/') || image.includes('..') || image.includes('\\')) {
        throw new Error(`${filename}: caminho de imagem inválido: ${image}.`);
      }
      try { await access(path.join(root, image)); }
      catch { throw new Error(`${filename}: imagem não encontrada: ${image}.`); }
    }
    // Explicit allowlist: editorial fields and future internal notes are not shipped to the site.
    const publicProject = { id: p.id, pageEnabled: p.pageEnabled };
    for (const key of TEXT_FIELDS) if (p[key] != null) publicProject[key] = String(p[key]);
    publicProject.coverImage = p.coverImage || p.images?.[0]?.image || '';
    publicProject.images = (p.images || []).map(i => ({ image: i.image, altPT: i.altPT || '', altEN: i.altEN || '' }));
    projects.push(publicProject);
  }
  return projects;
}

export async function build(root = ROOT) {
  // Validate before replacing the previous successful build.
  const projects = await readProjects(root);
  const output = path.join(root, 'dist');
  await rm(output, { recursive: true, force: true });
  await mkdir(path.join(output, 'data'), { recursive: true });
  for (const item of ['index.html', 'admin', 'images', 'assets']) {
    await cp(path.join(root, item), path.join(output, item), {
      recursive: true,
      filter: source => !path.basename(source).startsWith('.') && !/Thumbs\.db$/i.test(source)
    });
  }
  await writeFile(path.join(output, 'data/projects.json'), JSON.stringify(projects));
  await writeFile(path.join(output, '.nojekyll'), '');
  console.log(`Site preparado: ${projects.length} projetos públicos em dist/.`);
  return projects;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch(error => { console.error(error.message); process.exitCode = 1; });
}
