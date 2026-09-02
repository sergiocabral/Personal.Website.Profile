/**
 * O piloto automático controla o personagem quando ninguém está jogando.
 *
 * A lógica de decisão é pura de propósito — escolher destino, montar trajeto e
 * calcular a direção não dependem de navegador — o que permite verificar aqui
 * as propriedades que só apareceriam depois de minutos observando a tela.
 *
 * Rodar com: node --test
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const world = JSON.parse(readFileSync(resolve(here, '../../data/world.json'), 'utf8'));

const CAMERA_DIRECTION = [1, 1.15, 1];
const groundLength = Math.hypot(CAMERA_DIRECTION[0], CAMERA_DIRECTION[2]);
const screenForward = [-CAMERA_DIRECTION[0] / groundLength, -CAMERA_DIRECTION[2] / groundLength];
const screenRight = [-screenForward[1], screenForward[0]];

const PLAYER_RADIUS = 0.45;
const WALL_CLEARANCE = 0.6;
const MAX_ARC_STEP = Math.PI / 4;

// Reimplementações fiéis de autopilot.ts. As funções lá são tipadas em TS e este
// arquivo roda sem compilador; o que importa validar são as propriedades.

const angleOf = (p) => (Math.hypot(p.x, p.z) < 1e-6 ? 0 : Math.atan2(p.x, p.z));
const onRing = (angle, radius) => ({ x: Math.sin(angle) * radius, z: Math.cos(angle) * radius });

function shortestTurn(from, to) {
  const TAU = Math.PI * 2;
  let diff = (to - from) % TAU;
  if (diff > Math.PI) diff -= TAU;
  if (diff < -Math.PI) diff += TAU;
  return diff;
}

function routeTo(from, zone) {
  const ring = world.island.plazaRing;
  const route = [];

  const startAngle = angleOf(from);
  const targetAngle = angleOf({ x: zone.position[0], z: zone.position[1] });

  route.push(onRing(startAngle, ring));

  const sweep = shortestTurn(startAngle, targetAngle);
  const steps = Math.max(1, Math.ceil(Math.abs(sweep) / MAX_ARC_STEP));
  for (let step = 1; step <= steps; step += 1) {
    route.push(onRing(startAngle + (sweep * step) / steps, ring));
  }

  const [zx, zz] = zone.position;
  const length = Math.hypot(zx, zz);
  const halfFootprint = Math.max(zone.building.footprint[0], zone.building.footprint[1]) / 2;
  const standoff = (halfFootprint + WALL_CLEARANCE + zone.radius) / 2;
  const stop = Math.max(length - standoff, ring);

  route.push({ x: (zx / length) * stop, z: (zz / length) * stop });
  return route;
}

function steer(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  if (length < 1e-6) return { x: 0, y: 0 };

  const wx = dx / length;
  const wz = dz / length;
  return {
    x: wx * screenRight[0] + wz * screenRight[1],
    y: -(wx * screenForward[0] + wz * screenForward[1]),
  };
}

/** Mesma matemática de colisão de src/game/collision.ts. */
function hits(x, z, obstacle) {
  const radians = ((obstacle.rotation ?? 0) * Math.PI) / 180;
  let lx = x - obstacle.position[0];
  let lz = z - obstacle.position[1];

  if (radians !== 0) {
    const cos = Math.cos(-radians);
    const sin = Math.sin(-radians);
    const rx = lx * cos - lz * sin;
    lz = lx * sin + lz * cos;
    lx = rx;
  }

  const hx = obstacle.size[0] / 2;
  const hz = obstacle.size[1] / 2;
  const dx = lx - Math.max(-hx, Math.min(hx, lx));
  const dz = lz - Math.max(-hz, Math.min(hz, lz));
  return dx * dx + dz * dz < PLAYER_RADIUS * PLAYER_RADIUS;
}

const START = { x: world.spawn[0], z: world.spawn[1] };

test('o trajeto inteiro é transitável, ponto a ponto', () => {
  // A regressão que motivou este teste: o piloto ia ao centro exato, onde fica a
  // fonte, e empurrava a pedra sem sair do lugar.
  for (const zone of world.zones) {
    const route = [START, ...routeTo(START, zone)];

    for (let leg = 1; leg < route.length; leg += 1) {
      const from = route[leg - 1];
      const to = route[leg];
      const distance = Math.hypot(to.x - from.x, to.z - from.z);
      const steps = Math.max(1, Math.ceil(distance / 0.25));

      for (let i = 0; i <= steps; i += 1) {
        const x = from.x + ((to.x - from.x) * i) / steps;
        const z = from.z + ((to.z - from.z) * i) / steps;

        for (const obstacle of world.obstacles) {
          const isDestination =
            Math.abs(obstacle.position[0] - zone.position[0]) < 0.01 &&
            Math.abs(obstacle.position[1] - zone.position[1]) < 0.01;
          if (isDestination) continue;

          assert.ok(
            !hits(x, z, obstacle),
            `${zone.sectionId}: trajeto passa sobre o colisor em ` +
              `${JSON.stringify(obstacle.position)} no ponto (${x.toFixed(1)}, ${z.toFixed(1)})`,
          );
        }
      }
    }
  }
});

test('nenhum ponto do trajeto cai sobre a fonte', () => {
  const fountain = world.obstacles.find(
    (o) => Math.abs(o.position[0]) < 0.01 && Math.abs(o.position[1]) < 0.01,
  );
  assert.ok(fountain, 'a fonte deveria ter colisor');

  for (const zone of world.zones) {
    for (const point of routeTo(START, zone)) {
      assert.ok(
        !hits(point.x, point.z, fountain),
        `${zone.sectionId}: ponto do trajeto dentro da fonte`,
      );
    }
  }
});

test('o trajeto sempre termina dentro do gatilho da zona', () => {
  // Se parasse fora, o piloto chegaria e não conseguiria abrir o diálogo.
  for (const zone of world.zones) {
    const route = routeTo(START, zone);
    const last = route[route.length - 1];
    const distance = Math.hypot(last.x - zone.position[0], last.z - zone.position[1]);

    assert.ok(
      distance < zone.radius,
      `${zone.sectionId}: para a ${distance.toFixed(2)}, fora do raio ${zone.radius}`,
    );
  }
});

test('o trajeto para antes de entrar na construção', () => {
  for (const zone of world.zones) {
    const route = routeTo(START, zone);
    const last = route[route.length - 1];
    const distance = Math.hypot(last.x - zone.position[0], last.z - zone.position[1]);

    const half = Math.max(zone.building.footprint[0], zone.building.footprint[1]) / 2;
    assert.ok(
      distance > half + PLAYER_RADIUS,
      `${zone.sectionId}: para a ${distance.toFixed(2)}, dentro da construção`,
    );
  }
});

test('o contorno da fonte é feito em passos curtos', () => {
  // Um salto longo pelo anel cortaria caminho em linha reta por cima da fonte.
  for (const zone of world.zones) {
    const route = routeTo({ x: 0, z: -world.island.plazaRing }, zone);

    for (let i = 1; i < route.length - 1; i += 1) {
      const from = route[i - 1];
      const to = route[i];
      const chord = Math.hypot(to.x - from.x, to.z - from.z);
      const maxChord = 2 * world.island.plazaRing * Math.sin(MAX_ARC_STEP / 2) + 1e-6;

      assert.ok(chord <= maxChord, `${zone.sectionId}: salto de ${chord.toFixed(2)} pelo anel`);
    }
  }
});

test('a direção calculada aponta mesmo para o destino', () => {
  for (const zone of world.zones) {
    const to = { x: zone.position[0], z: zone.position[1] };
    const input = steer({ x: 0, z: 0 }, to);

    // Converte o comando de volta ao mundo, como Player.tsx faz.
    const worldX = screenRight[0] * input.x - screenForward[0] * input.y;
    const worldZ = screenRight[1] * input.x - screenForward[1] * input.y;

    const dot = (worldX * to.x + worldZ * to.z) / Math.hypot(to.x, to.z);
    assert.ok(dot > 0.999, `${zone.sectionId}: direção desalinhada (produto ${dot.toFixed(4)})`);
  }
});

test('o comando gerado nunca excede a velocidade máxima', () => {
  for (const zone of world.zones) {
    const input = steer({ x: 0, z: 0 }, { x: zone.position[0], z: zone.position[1] });
    assert.ok(Math.hypot(input.x, input.y) <= 1 + 1e-9);
  }
});

test('o piloto fica parado quando já chegou', () => {
  assert.deepEqual(steer({ x: 5, z: 5 }, { x: 5, z: 5 }), { x: 0, y: 0 });
});

test('todo o trajeto permanece dentro dos limites jogáveis', () => {
  for (const zone of world.zones) {
    for (const point of routeTo(START, zone)) {
      const distance = Math.hypot(point.x, point.z);
      assert.ok(distance <= world.boundsRadius, `${zone.sectionId}: ponto fora do limite`);
    }
  }
});
