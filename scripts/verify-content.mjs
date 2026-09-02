/**
 * Validação dos dados em tempo de build.
 *
 * O TypeScript não valida `content.json` contra `ContentData` — com
 * `resolveJsonModule` ele apenas infere a forma do literal, então um
 * `iconStyle: "britas"` compilaria sem reclamar. Além disso, os erros que mais
 * doem aqui são relacionais (uma zona apontando para uma seção que não existe,
 * um gatilho menor que o prédio) e nenhum sistema de tipos pegaria.
 *
 * Roda no CI antes do build. Sai com código 1 na primeira falha real.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (name) => JSON.parse(readFileSync(resolve(here, '..', 'src', 'data', name), 'utf8'));

const content = read('content.json');
const world = read('world.json');

const LOCALES = ['pt-BR', 'en'];
const ALLOWED_TOKENS = new Set(['age']);

const errors = [];
const warnings = [];

const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

/** Todo texto localizado precisa das duas variantes, ambas não vazias. */
function checkLocalized(value, where) {
  if (!value || typeof value !== 'object') {
    fail(`${where}: texto localizado ausente`);
    return;
  }

  for (const locale of LOCALES) {
    if (typeof value[locale] !== 'string' || value[locale].trim() === '') {
      fail(`${where}: falta a tradução "${locale}"`);
    }
  }

  for (const text of Object.values(value)) {
    if (typeof text !== 'string') continue;
    for (const [, token] of text.matchAll(/\{(\w+)\}/g)) {
      if (!ALLOWED_TOKENS.has(token)) {
        fail(`${where}: marcador desconhecido "{${token}}"`);
      }
    }
  }
}

// ------------------------------------------------------------------ perfil ---

const { profile } = content;

if (!profile.url.startsWith('https://')) fail('profile.url precisa ser https');
if (profile.url.includes('sergiocabral.com')) {
  fail('profile.url ainda aponta para o domínio antigo .com');
}
if (Number.isNaN(Date.parse(profile.birthDate))) {
  fail(`profile.birthDate inválido: ${profile.birthDate}`);
}

checkLocalized(profile.role, 'profile.role');
checkLocalized(profile.seo.title, 'profile.seo.title');
checkLocalized(profile.seo.description, 'profile.seo.description');

// ------------------------------------------------------------------ seções ---

const seenUrls = new Map();
let linkCount = 0;

for (const section of content.sections) {
  const where = `seção "${section.id}"`;

  checkLocalized(section.label, `${where}.label`);
  checkLocalized(section.dialog.greeting, `${where}.dialog.greeting`);
  if (section.dialog.body) checkLocalized(section.dialog.body, `${where}.dialog.body`);

  for (const link of section.links) {
    linkCount += 1;
    const linkWhere = `${where} → "${link.name}"`;

    if (link.url.startsWith('http://')) {
      fail(`${linkWhere}: usa http:// em vez de https://`);
    }
    if (!/^(https:\/\/|mailto:)/.test(link.url)) {
      fail(`${linkWhere}: URL precisa ser absoluta (https:// ou mailto:)`);
    }

    const previous = seenUrls.get(link.url);
    if (previous) fail(`${linkWhere}: URL repetida (já usada em "${previous}")`);
    seenUrls.set(link.url, link.name);

    if (!['solid', 'regular', 'brands'].includes(link.iconStyle)) {
      fail(`${linkWhere}: iconStyle inválido "${link.iconStyle}"`);
    }
    if (link.description) checkLocalized(link.description, `${linkWhere}.description`);
  }
}

// ------------------------------------------------------------------- mundo ---

const sectionIds = new Set(content.sections.map((section) => section.id));
const zonedIds = new Set();

for (const zone of world.zones) {
  const where = `zona "${zone.sectionId}"`;

  if (!sectionIds.has(zone.sectionId)) {
    fail(`${where}: não existe seção com esse id em content.json`);
  }
  zonedIds.add(zone.sectionId);

  // O gatilho tem que ser alcançável sem colar na parede do prédio.
  const half = Math.max(zone.building.footprint[0], zone.building.footprint[1]) / 2;
  if (zone.radius < half + 1.5) {
    fail(`${where}: raio ${zone.radius} é pequeno demais para um prédio de meia-largura ${half}`);
  }

  // A zona inteira precisa caber dentro dos limites jogáveis.
  const distance = Math.hypot(zone.position[0], zone.position[1]);
  if (distance + zone.radius > world.boundsRadius) {
    fail(`${where}: parte do gatilho fica fora de boundsRadius`);
  }
}

for (const id of sectionIds) {
  if (!zonedIds.has(id)) fail(`seção "${id}" não tem zona no mundo — ficaria inalcançável`);
}

// Zonas sobrepostas tornariam uma delas impossível de ativar.
for (let i = 0; i < world.zones.length; i += 1) {
  for (let j = i + 1; j < world.zones.length; j += 1) {
    const a = world.zones[i];
    const b = world.zones[j];
    const gap = Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1]);
    if (gap < a.radius + b.radius) {
      fail(`zonas "${a.sectionId}" e "${b.sectionId}" se sobrepõem`);
    }
  }
}

// O ponto de partida não pode nascer dentro de um obstáculo.
const PLAYER_RADIUS = 0.45;
for (const obstacle of world.obstacles) {
  const dx = Math.abs(world.spawn[0] - obstacle.position[0]) - obstacle.size[0] / 2;
  const dz = Math.abs(world.spawn[1] - obstacle.position[1]) - obstacle.size[1] / 2;
  if (dx < PLAYER_RADIUS && dz < PLAYER_RADIUS) {
    fail(`spawn ${JSON.stringify(world.spawn)} está dentro de um obstáculo`);
  }
}

// Todo prédio precisa de colisor, senão dá para atravessá-lo.
for (const zone of world.zones) {
  const covered = world.obstacles.some(
    (obstacle) =>
      Math.abs(obstacle.position[0] - zone.position[0]) < 0.01 &&
      Math.abs(obstacle.position[1] - zone.position[1]) < 0.01,
  );
  if (!covered) warn(`zona "${zone.sectionId}" não tem obstáculo — o prédio é atravessável`);
}

// ---------------------------------------------------------------- relatório ---

for (const message of warnings) console.warn(`aviso: ${message}`);

if (errors.length > 0) {
  console.error(`\n${errors.length} problema(s) encontrado(s):\n`);
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(
  `conteúdo válido: ${content.sections.length} seções, ${linkCount} links, ` +
    `${world.zones.length} zonas, ${world.props.length} adereços.`,
);
