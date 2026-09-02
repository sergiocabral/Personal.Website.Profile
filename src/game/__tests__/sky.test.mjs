/**
 * As nuvens já taparam o jogo uma vez: flutuavam livremente e passavam entre a
 * câmera e a ilha. A correção não foi reposicioná-las na mão, foi restringir a
 * região onde podem existir.
 *
 * Estes testes varrem o ciclo inteiro da animação e provam que, em nenhum
 * instante, uma nuvem entra no volume entre a câmera e o mundo.
 *
 * Rodar com: node --test
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const CAMERA_DIRECTION = [1, 1.15, 1];

const groundLength = Math.hypot(CAMERA_DIRECTION[0], CAMERA_DIRECTION[2]);
const cameraGround = [CAMERA_DIRECTION[0] / groundLength, CAMERA_DIRECTION[2] / groundLength];
const behind = [-cameraGround[0], -cameraGround[1]];

const forward = [-cameraGround[0], -cameraGround[1]];
const screenRight = [-forward[1], forward[0]];

const MIN_DISTANCE = 62;
const MIN_HEIGHT = 34;
const SPAN = 150;

/** Mesmos valores de Sky.tsx. */
const CLOUDS = [
  { offset: -46, distance: 88, height: 44, speed: 0.5, scale: 1.6 },
  { offset: -14, distance: 74, height: 38, speed: 0.38, scale: 1.2 },
  { offset: 16, distance: 96, height: 50, speed: 0.44, scale: 1.8 },
  { offset: 44, distance: 78, height: 40, speed: 0.32, scale: 1.3 },
  { offset: 68, distance: 104, height: 56, speed: 0.28, scale: 1.5 },
];

function positionAt(cloud, time) {
  const travelled = (((cloud.offset + time * cloud.speed) % SPAN) + SPAN) % SPAN;
  const lateral = travelled - SPAN / 2;
  return {
    x: behind[0] * cloud.distance + screenRight[0] * lateral,
    y: cloud.height,
    z: behind[1] * cloud.distance + screenRight[1] * lateral,
  };
}

/** Varre 10 minutos de animação, amostrando a cada quarto de segundo. */
function everyPosition(callback) {
  for (const cloud of CLOUDS) {
    for (let time = 0; time < 600; time += 0.25) {
      callback(positionAt(cloud, time), cloud, time);
    }
  }
}

test('nenhuma nuvem entra no lado da câmera', () => {
  everyPosition((position, cloud, time) => {
    // Projeção na direção da câmera: negativa significa "atrás da ilha".
    const towardsCamera = position.x * cameraGround[0] + position.z * cameraGround[1];
    assert.ok(
      towardsCamera < 0,
      `nuvem em t=${time} projeta ${towardsCamera.toFixed(1)} para o lado da câmera`,
    );
  });
});

test('nenhuma nuvem chega perto da ilha', () => {
  // A ilha tem raio 20,8. Nada pode entrar nessa área nem no seu entorno.
  everyPosition((position) => {
    const distance = Math.hypot(position.x, position.z);
    assert.ok(distance > MIN_DISTANCE * 0.6, `nuvem a apenas ${distance.toFixed(1)} do centro`);
  });
});

test('todas as nuvens ficam acima do enquadramento da vila', () => {
  // A construção mais alta é a torre, com cerca de 9 unidades no topo.
  everyPosition((position) => {
    assert.ok(position.y >= MIN_HEIGHT, `nuvem baixa demais: y=${position.y}`);
  });
});

test('a distância até a câmera não varia ao longo da deriva', () => {
  // A deriva é lateral na tela; se ela alterasse a profundidade, uma nuvem
  // poderia se aproximar o suficiente para cobrir o mundo.
  for (const cloud of CLOUDS) {
    const first = positionAt(cloud, 0);
    const later = positionAt(cloud, 37);

    const depthFirst = first.x * cameraGround[0] + first.z * cameraGround[1];
    const depthLater = later.x * cameraGround[0] + later.z * cameraGround[1];

    assert.ok(
      Math.abs(depthFirst - depthLater) < 1e-9,
      `a profundidade mudou de ${depthFirst.toFixed(3)} para ${depthLater.toFixed(3)}`,
    );
  }
});

test('o eixo de deriva é perpendicular à direção da câmera', () => {
  const dot = screenRight[0] * cameraGround[0] + screenRight[1] * cameraGround[1];
  assert.ok(Math.abs(dot) < 1e-9, `deveria ser perpendicular, produto escalar ${dot}`);
});
