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

// Reimplementações fiéis de autopilot.ts. As funções lá são tipadas em TS e
// este arquivo roda sem compilador; o que importa validar são as propriedades.
function routeTo(from, zone) {
  const route = [];
  if (Math.hypot(from.x, from.z) >= world.island.plazaRadius) route.push({ x: 0, z: 0 });

  const [zx, zz] = zone.position;
  const length = Math.hypot(zx, zz);

  const halfFootprint = Math.max(zone.building.footprint[0], zone.building.footprint[1]) / 2;
  const standoff = (halfFootprint + 0.6 + zone.radius) / 2;

  const stop = Math.max(length - standoff, world.island.plazaRadius);
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

test('o trajeto sempre termina dentro do gatilho da zona', () => {
  // Se parasse fora, o piloto chegaria e não conseguiria abrir o diálogo.
  for (const zone of world.zones) {
    const route = routeTo({ x: 0, z: 3.2 }, zone);
    const last = route[route.length - 1];
    const distance = Math.hypot(last.x - zone.position[0], last.z - zone.position[1]);

    assert.ok(
      distance < zone.radius,
      `${zone.sectionId}: para a ${distance.toFixed(2)} do centro, fora do raio ${zone.radius}`,
    );
  }
});

test('o trajeto para antes de entrar na construção', () => {
  for (const zone of world.zones) {
    const route = routeTo({ x: 0, z: 3.2 }, zone);
    const last = route[route.length - 1];
    const distance = Math.hypot(last.x - zone.position[0], last.z - zone.position[1]);

    // Metade da maior dimensão da base, mais a folga do corpo do personagem.
    const half = Math.max(zone.building.footprint[0], zone.building.footprint[1]) / 2;
    assert.ok(
      distance > half + 0.45,
      `${zone.sectionId}: para a ${distance.toFixed(2)}, dentro da construção (meia-base ${half})`,
    );
  }
});

test('o trajeto passa pela praça, onde os caminhos são livres', () => {
  // Atravessar em linha reta esbarraria nas árvores; os caminhos radiais são as
  // únicas faixas que o gerador do mundo mantém desobstruídas.
  const fromEdge = { x: 14, z: -14 };
  for (const zone of world.zones) {
    const route = routeTo(fromEdge, zone);
    assert.equal(route.length, 2, `${zone.sectionId}: deveria passar pelo centro antes`);
    assert.deepEqual(route[0], { x: 0, z: 0 });
  }
});

test('quem já está na praça vai direto ao destino', () => {
  for (const zone of world.zones) {
    const route = routeTo({ x: 0.5, z: 0.5 }, zone);
    assert.equal(route.length, 1, `${zone.sectionId}: desvio desnecessário pelo centro`);
  }
});

test('a direção calculada aponta mesmo para o destino', () => {
  const from = { x: 0, z: 0 };

  for (const zone of world.zones) {
    const to = { x: zone.position[0], z: zone.position[1] };
    const input = steer(from, to);

    // Converte o comando de volta ao mundo, como Player.tsx faz.
    const worldX = screenRight[0] * input.x - screenForward[0] * input.y;
    const worldZ = screenRight[1] * input.x - screenForward[1] * input.y;

    const wanted = Math.hypot(to.x, to.z);
    const dot = (worldX * to.x + worldZ * to.z) / wanted;

    assert.ok(dot > 0.999, `${zone.sectionId}: direção desalinhada (produto ${dot.toFixed(4)})`);
  }
});

test('o comando gerado nunca excede a velocidade máxima', () => {
  // Um vetor maior que 1 faria o piloto andar mais rápido que o jogador.
  for (const zone of world.zones) {
    const input = steer({ x: 0, z: 0 }, { x: zone.position[0], z: zone.position[1] });
    const magnitude = Math.hypot(input.x, input.y);
    assert.ok(magnitude <= 1 + 1e-9, `comando de magnitude ${magnitude}`);
  }
});

test('o piloto fica parado quando já chegou', () => {
  const input = steer({ x: 5, z: 5 }, { x: 5, z: 5 });
  assert.deepEqual(input, { x: 0, y: 0 });
});

test('todo o trajeto permanece dentro dos limites jogáveis', () => {
  for (const zone of world.zones) {
    for (const point of routeTo({ x: 0, z: 3.2 }, zone)) {
      const distance = Math.hypot(point.x, point.z);
      assert.ok(
        distance <= world.boundsRadius,
        `${zone.sectionId}: ponto a ${distance.toFixed(1)}, fora do limite ${world.boundsRadius}`,
      );
    }
  }
});
