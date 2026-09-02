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

// Todo prédio precisa de colisor, senão dá para atravessá-lo.
for (const zone of world.zones) {
  const covered = world.obstacles.some(
    (obstacle) =>
      Math.abs(obstacle.position[0] - zone.position[0]) < 0.01 &&
      Math.abs(obstacle.position[1] - zone.position[1]) < 0.01,
  );
  if (!covered) warn(`zona "${zone.sectionId}" não tem obstáculo — o prédio é atravessável`);
}

/*
 * Navegabilidade.
 *
 * O personagem já ficou preso a caminho das construções duas vezes, sempre pelo
 * mesmo motivo: algo com colisão em cima do trajeto. Primeiro os bancos, que
 * estavam sobre as diagonais por onde passam os caminhos; depois a própria
 * fonte, no centro exato para onde o piloto automático se dirigia.
 *
 * Em vez de medir distâncias e torcer para a conta estar certa, esta checagem
 * percorre o trajeto de verdade — o mesmo que o piloto faz — testando cada
 * passo com a mesma matemática de colisão do jogo. Se o caminho não é
 * transitável, o build falha.
 */

const PLAYER_RADIUS_NAV = 0.45;

/** De quanto em quanto o trajeto é amostrado, em unidades de mundo. */
const STEP = 0.25;

/** Igual a `circleHitsBox` em src/game/collision.ts. */
function hits(x, z, radius, obstacle) {
  const radians = ((obstacle.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(-radians);
  const sin = Math.sin(-radians);

  let localX = x - obstacle.position[0];
  let localZ = z - obstacle.position[1];

  if (radians !== 0) {
    const rotatedX = localX * cos - localZ * sin;
    localZ = localX * sin + localZ * cos;
    localX = rotatedX;
  }

  const halfX = obstacle.size[0] / 2;
  const halfZ = obstacle.size[1] / 2;

  const dx = localX - Math.max(-halfX, Math.min(halfX, localX));
  const dz = localZ - Math.max(-halfZ, Math.min(halfZ, localZ));

  return dx * dx + dz * dz < radius * radius;
}

/** O que bloqueia o ponto, ignorando a construção de destino. */
function blockedBy(x, z, exceptZone) {
  for (const obstacle of world.obstacles) {
    if (exceptZone) {
      const isTarget =
        Math.abs(obstacle.position[0] - exceptZone.position[0]) < 0.01 &&
        Math.abs(obstacle.position[1] - exceptZone.position[1]) < 0.01;
      if (isTarget) continue;
    }
    if (hits(x, z, PLAYER_RADIUS_NAV, obstacle)) return obstacle;
  }
  return null;
}

const ring = world.island.plazaRing;

// 1. Dá para dar a volta completa na fonte pelo anel?
for (let i = 0; i < 180; i += 1) {
  const angle = (i / 180) * Math.PI * 2;
  const x = Math.sin(angle) * ring;
  const z = Math.cos(angle) * ring;

  const blocker = blockedBy(x, z, null);
  if (blocker) {
    fail(
      `anel da praça intransitável em ${Math.round((angle * 180) / Math.PI)}°: ` +
        `colisor em ${JSON.stringify(blocker.position)}`,
    );
    break;
  }
}

// 2. Dá para ir do anel até a frente de cada construção?
for (const zone of world.zones) {
  const [zx, zz] = zone.position;
  const length = Math.hypot(zx, zz);
  const unit = [zx / length, zz / length];

  const halfFootprint = Math.max(zone.building.footprint[0], zone.building.footprint[1]) / 2;
  const standoff = (halfFootprint + 0.6 + zone.radius) / 2;
  const stop = Math.max(length - standoff, ring);

  let blocked = false;
  for (let distance = ring; distance <= stop && !blocked; distance += STEP) {
    const blocker = blockedBy(unit[0] * distance, unit[1] * distance, zone);
    if (blocker) {
      fail(
        `caminho para "${zone.sectionId}" bloqueado a ${distance.toFixed(1)} do centro: ` +
          `colisor em ${JSON.stringify(blocker.position)}`,
      );
      blocked = true;
    }
  }

  // O ponto de parada precisa acionar o gatilho, senão o piloto chega e não abre nada.
  const stopX = unit[0] * stop;
  const stopZ = unit[1] * stop;
  if (Math.hypot(stopX - zx, stopZ - zz) >= zone.radius) {
    fail(`o fim do caminho para "${zone.sectionId}" fica fora do gatilho da zona`);
  }
}

// 3. O ponto de partida está livre?
if (blockedBy(world.spawn[0], world.spawn[1], null)) {
  fail(`spawn ${JSON.stringify(world.spawn)} está dentro de um obstáculo`);
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
