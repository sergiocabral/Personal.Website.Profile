import type { Obstacle } from '../data/schema';

/**
 * Colisor pré-calculado.
 *
 * A rotação vem em seno/cosseno já resolvidos porque o teste roda para cada
 * obstáculo, a cada frame: refazer `Math.cos` ali dentro é desperdício.
 */
export type Box = {
  cx: number;
  cz: number;
  halfX: number;
  halfZ: number;
  /** Cosseno e seno do ângulo *inverso*, para levar o ponto ao espaço da caixa. */
  cos: number;
  sin: number;
  rotated: boolean;
};

export function toBoxes(obstacles: Obstacle[]): Box[] {
  return obstacles.map(({ position, size, rotation = 0 }) => {
    const radians = (rotation * Math.PI) / 180;
    return {
      cx: position[0],
      cz: position[1],
      halfX: size[0] / 2,
      halfZ: size[1] / 2,
      cos: Math.cos(-radians),
      sin: Math.sin(-radians),
      rotated: rotation !== 0,
    };
  });
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * O círculo de raio `r` centrado em (x, z) toca a caixa?
 *
 * Leva o ponto para o espaço local da caixa (onde ela vira um AABB), projeta o
 * centro dentro dos limites e mede a distância até essa projeção. Comparação ao
 * quadrado para não pagar a raiz quadrada.
 */
export function circleHitsBox(x: number, z: number, r: number, box: Box): boolean {
  let localX = x - box.cx;
  let localZ = z - box.cz;

  if (box.rotated) {
    const rotatedX = localX * box.cos - localZ * box.sin;
    localZ = localX * box.sin + localZ * box.cos;
    localX = rotatedX;
  }

  const dx = localX - clamp(localX, -box.halfX, box.halfX);
  const dz = localZ - clamp(localZ, -box.halfZ, box.halfZ);

  return dx * dx + dz * dz < r * r;
}

export function hitsAny(x: number, z: number, r: number, boxes: Box[]): boolean {
  for (const box of boxes) {
    if (circleHitsBox(x, z, r, box)) return true;
  }
  return false;
}

/**
 * Move resolvendo cada eixo separadamente.
 *
 * É o que faz o personagem deslizar ao longo de uma parede em vez de grudar
 * nela: se o passo em X colide, só o X é descartado e o Z continua valendo.
 */
export function slideMove(
  from: { x: number; z: number },
  dx: number,
  dz: number,
  radius: number,
  boxes: Box[],
): { x: number; z: number } {
  let { x, z } = from;

  const nextX = x + dx;
  if (!hitsAny(nextX, z, radius, boxes)) x = nextX;

  const nextZ = z + dz;
  if (!hitsAny(x, nextZ, radius, boxes)) z = nextZ;

  return { x, z };
}

/** Mantém o personagem dentro do disco jogável. */
export function clampToBounds(
  point: { x: number; z: number },
  boundsRadius: number,
): { x: number; z: number } {
  const distance = Math.hypot(point.x, point.z);
  if (distance <= boundsRadius) return point;

  const scale = boundsRadius / distance;
  return { x: point.x * scale, z: point.z * scale };
}
