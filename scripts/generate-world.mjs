/**
 * Gera `src/data/world.json`.
 *
 * O mapa é derivado, não escrito à mão: posições, colisores e decoração saem
 * todos daqui, com semente fixa, então o mundo é idêntico em qualquer máquina e
 * em qualquer build. Editar o JSON direto funciona, mas a próxima execução
 * deste script sobrescreve — mexa aqui.
 *
 * A regra que organiza tudo: os quatro caminhos saem do centro nas diagonais,
 * onde ficam as construções. Nada com colisão pode ocupar esses corredores nem
 * o anel de circulação em volta da fonte, senão o personagem — e o piloto
 * automático — ficam presos. `verify-content.mjs` confere isso a cada build.
 *
 * Rodar com: npm run generate:world
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '..', 'src', 'data', 'world.json');

/** Distância do centro até cada construção. */
const RING = 11.5;
const D = RING / Math.SQRT2;

/** Meia-largura do corredor livre ao longo de cada caminho. */
export const PATH_CLEARANCE = 2.6;

/** Raio do anel por onde se circula em volta da fonte, dentro da praça. */
export const PLAZA_RING = 3.4;

/** Raio do personagem, para dimensionar as folgas. */
const PLAYER_RADIUS = 0.45;

/**
 * Onde ficam os bancos, medido do centro.
 *
 * Derivado do anel em vez de escolhido a olho: o anel precisa continuar
 * transitável, então o banco começa depois dele, do corpo do personagem e de
 * uma folga. Escrever o número à mão já custou um banco encostando no anel.
 */
const BENCH_HALF_DEPTH = 0.4;
const BENCH_RADIUS = PLAZA_RING + PLAYER_RADIUS + BENCH_HALF_DEPTH + 0.75;

/** Postes atrás dos bancos, já sobre a grama. */
const LAMP_RADIUS = 6.3;

const zones = [
  {
    sectionId: 'projects',
    screen: 'cima',
    pos: [-D, -D],
    kind: 'workshop',
    roof: 'roofPurple',
    h: 4.6,
    foot: [5.2, 4.6],
  },
  {
    sectionId: 'contacts',
    screen: 'direita',
    pos: [D, -D],
    kind: 'house',
    roof: 'roofRed',
    h: 3.8,
    foot: [4.8, 4.4],
  },
  {
    sectionId: 'about',
    screen: 'baixo',
    pos: [D, D],
    kind: 'signboard',
    roof: 'roofOrange',
    h: 3.0,
    foot: [3.4, 1.2],
  },
  {
    sectionId: 'social',
    screen: 'esquerda',
    pos: [-D, D],
    kind: 'tower',
    roof: 'roofBlue',
    h: 6.4,
    foot: [4.0, 4.0],
  },
];

const round = (n) => Math.round(n * 100) / 100;
const degrees = (radians) => round((radians * 180) / Math.PI);

const world = {
  island: {
    grassRadius: 18,
    sandRadius: 20.8,
    waterRadius: 60,
    plazaRadius: 5.4,
    /** Raio do anel livre em volta da fonte. O piloto o usa para contorná-la. */
    plazaRing: PLAZA_RING,
  },
  spawn: [0, PLAZA_RING],
  boundsRadius: 18.6,
  zones: zones.map((z) => {
    const facing = degrees(Math.atan2(-z.pos[0], -z.pos[1]));
    return {
      sectionId: z.sectionId,
      position: [round(z.pos[0]), round(z.pos[1])],
      // O gatilho tem que cobrir a frente da construção sem exigir encostar nela.
      radius: round(Math.max(z.foot[0], z.foot[1]) / 2 + 2.4),
      // A fachada olha para a praça: é de lá que o visitante sempre chega.
      facing,
      building: {
        kind: z.kind,
        height: z.h,
        footprint: z.foot,
        color: 'wall',
        roofColor: z.roof,
        rotation: facing,
      },
    };
  }),
  props: [],
  obstacles: [],
};

const props = [];
const random = mulberry32(20260902);

props.push({ kind: 'fountain', position: [0, 0] });

/*
 * Móveis da praça.
 *
 * Ficam nos quatro rumos cardeais, que são os setores entre os caminhos. Antes
 * os bancos estavam sobre as diagonais, ou seja, em cima dos caminhos, e
 * barravam a saída da praça — quem tentava sair travava neles.
 *
 * Cada setor recebe um banco voltado para a fonte, com um poste atrás.
 */
for (let i = 0; i < 4; i += 1) {
  const angle = (i * Math.PI) / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  props.push({
    kind: 'bench',
    position: [round(cos * BENCH_RADIUS), round(sin * BENCH_RADIUS)],
    rotation: round(180 - degrees(angle)),
  });
  props.push({
    kind: 'lamp',
    position: [round(cos * LAMP_RADIUS), round(sin * LAMP_RADIUS)],
  });
}

/** Distância de um ponto ao eixo do caminho que leva a uma construção. */
function distanceToPath(x, z, zone) {
  const [zx, zz] = zone.position;
  const lengthSq = zx * zx + zz * zz;
  const t = Math.max(0, Math.min(1, (x * zx + z * zz) / lengthSq));
  return Math.hypot(x - zx * t, z - zz * t);
}

/** Livre = fora da praça, das construções e dos corredores dos caminhos. */
function isFree(x, z, clearance) {
  if (Math.hypot(x, z) < world.island.plazaRadius + clearance) return false;
  if (Math.hypot(x, z) > world.island.grassRadius - 1.4) return false;

  for (const zone of world.zones) {
    const [zx, zz] = zone.position;
    if (Math.hypot(x - zx, z - zz) < zone.radius + clearance) return false;
    if (distanceToPath(x, z, zone) < PATH_CLEARANCE + clearance) return false;
  }
  return true;
}

function scatter(kind, count, clearance, extra = () => ({})) {
  let placed = 0;
  let tries = 0;

  while (placed < count && tries < count * 400) {
    tries += 1;
    const angle = random() * Math.PI * 2;
    const radius = 5 + random() * (world.island.grassRadius - 6);
    const x = round(Math.cos(angle) * radius);
    const z = round(Math.sin(angle) * radius);

    if (!isFree(x, z, clearance)) continue;
    if (props.some((p) => Math.hypot(p.position[0] - x, p.position[1] - z) < clearance * 1.6)) {
      continue;
    }

    props.push({ kind, position: [x, z], rotation: Math.round(random() * 360), ...extra() });
    placed += 1;
  }
}

scatter('tree', 22, 1.5, () => ({ scale: round(0.85 + random() * 0.4) }));
scatter('bush', 16, 1.0, () => ({ scale: round(0.8 + random() * 0.5) }));
scatter('rock', 9, 0.9, () => ({ scale: round(0.7 + random() * 0.6) }));
scatter('flower', 28, 0.6, () => ({ scale: round(0.8 + random() * 0.5) }));

world.props = props;

/*
 * Colisores.
 *
 * Derivados da decoração e das construções. Escrever à mão dessincronizaria na
 * primeira vez que alguém movesse uma árvore.
 */
const COLLIDER = {
  tree: [1.1, 1.1],
  rock: [1.0, 1.0],
  fountain: [2.8, 2.8],
  bench: [1.9, 0.8],
  bush: null, // rasteiro: atravessar não incomoda
  flower: null,
  lamp: null, // poste fino demais para valer um colisor
};

for (const zone of world.zones) {
  world.obstacles.push({
    position: zone.position,
    size: [round(zone.building.footprint[0]), round(zone.building.footprint[1])],
    rotation: zone.building.rotation,
  });
}

for (const prop of props) {
  const size = COLLIDER[prop.kind];
  if (!size) continue;

  const scale = prop.scale ?? 1;
  world.obstacles.push({
    position: prop.position,
    size: [round(size[0] * scale), round(size[1] * scale)],
    ...(prop.rotation ? { rotation: prop.rotation } : {}),
  });
}

writeFileSync(target, JSON.stringify(world, null, 2) + '\n');

console.log('mundo gerado:');
for (const zone of world.zones) {
  const source = zones.find((z) => z.sectionId === zone.sectionId);
  console.log(
    `  ${zone.sectionId.padEnd(9)} ${source.screen.padEnd(9)} ` +
      `pos=${JSON.stringify(zone.position)} raio=${zone.radius}`,
  );
}
console.log(`  ${props.length} adereços, ${world.obstacles.length} colisores`);

/** PRNG com semente, para o mapa ser idêntico em todo build. */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
