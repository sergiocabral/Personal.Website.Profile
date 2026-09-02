/**
 * A conversão de eixos de tela para eixos de mundo já esteve errada em 90°: a
 * seta para cima andava para a direita. O erro passou despercebido porque o
 * ângulo estava escrito à mão e "parecia certo" no código.
 *
 * Estes testes fixam as quatro direções contra a geometria da câmera, e não
 * contra a fórmula — se alguém mudar o ângulo da câmera, eles continuam válidos.
 *
 * Rodar com: node --test
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Lê CAMERA_DIRECTION do fonte, para o teste seguir a constante de verdade. */
function cameraDirection() {
  const source = readFileSync(resolve(here, '..', 'constants.ts'), 'utf8');
  const match = source.match(/CAMERA_DIRECTION:\s*\[number,\s*number,\s*number\]\s*=\s*\[([^\]]+)\]/);
  assert.ok(match, 'CAMERA_DIRECTION não encontrada em constants.ts');
  return match[1].split(',').map((value) => Number(value.trim()));
}

const [dirX, , dirZ] = cameraDirection();
const groundLength = Math.hypot(dirX, dirZ);

const forward = [-dirX / groundLength, -dirZ / groundLength];
const right = [-forward[1], forward[0]];

/** Mesma conversão de Player.tsx. */
function toWorld(inputX, inputY) {
  return [
    right[0] * inputX - forward[0] * inputY,
    right[1] * inputX - forward[1] * inputY,
  ];
}

const close = (a, b) => Math.abs(a - b) < 1e-9;

test('para cima na tela afasta o personagem da câmera', () => {
  const [x, z] = toWorld(0, -1);
  assert.ok(close(x, forward[0]) && close(z, forward[1]), `esperava ${forward}, veio [${x}, ${z}]`);
  // A câmera está em +X/+Z, então afastar-se dela significa ir para -X e -Z.
  assert.ok(x < 0 && z < 0, 'deveria andar em -X e -Z');
});

test('para baixo na tela aproxima o personagem da câmera', () => {
  const [x, z] = toWorld(0, 1);
  assert.ok(x > 0 && z > 0, 'deveria andar em +X e +Z');
});

test('para a direita na tela é perpendicular, não diagonal para baixo', () => {
  const [x, z] = toWorld(1, 0);
  assert.ok(close(x, right[0]) && close(z, right[1]));
  assert.ok(x > 0 && z < 0, 'deveria andar em +X e -Z');
});

test('esquerda é o oposto exato da direita', () => {
  const [rx, rz] = toWorld(1, 0);
  const [lx, lz] = toWorld(-1, 0);
  assert.ok(close(lx, -rx) && close(lz, -rz));
});

test('os eixos da tela são perpendiculares entre si', () => {
  const dot = right[0] * forward[0] + right[1] * forward[1];
  assert.ok(Math.abs(dot) < 1e-9, `os eixos deveriam ser ortogonais, produto escalar ${dot}`);
});

test('andar na diagonal não é mais rápido que na horizontal', () => {
  // O input já chega normalizado; a conversão precisa preservar o comprimento.
  const [x, z] = toWorld(Math.SQRT1_2, -Math.SQRT1_2);
  assert.ok(Math.abs(Math.hypot(x, z) - 1) < 1e-9, 'a conversão não pode alterar a velocidade');
});
