/**
 * Piloto automático: o personagem visita a vila sozinho.
 *
 * Serve ao mesmo propósito da tela de demonstração dos fliperamas — quem chega
 * vê o mundo se apresentando em vez de um boneco parado esperando que alguém
 * descubra que dá para andar. Assim que o visitante toca no teclado, o controle
 * é dele; depois de um tempo de inatividade, o passeio recomeça.
 *
 * A lógica de decisão fica aqui, em funções puras: o hook só a conecta ao loop
 * de animação. É o que permite testá-la sem navegador.
 */

import type { WorldData, Zone } from '../data/schema';

export type Point = { x: number; z: number };

export type AutopilotPhase =
  /** Indo até o próximo ponto do trajeto. */
  | 'travelling'
  /** Chegou à construção; uma pausa antes de abrir o diálogo. */
  | 'arriving'
  /** Diálogo aberto, "lendo". */
  | 'reading'
  /** Diálogo fechado, escolhendo o próximo destino. */
  | 'leaving';

export type AutopilotState = {
  phase: AutopilotPhase;
  /** Seção que está sendo visitada. */
  targetId: string | null;
  /** Pontos que faltam percorrer até o destino. */
  route: Point[];
  /** Tempo acumulado na fase atual, em segundos. */
  elapsed: number;
  /** Zonas já visitadas neste ciclo, para o passeio não repetir a mesma. */
  seen: string[];
};

/** Quanto tempo o piloto "lê" cada diálogo. */
export const READING_TIME = 7;

/** Pausa entre chegar e abrir o diálogo, para o movimento não parecer robótico. */
export const ARRIVING_TIME = 0.7;

/** Pausa depois de fechar o diálogo, antes de sair andando. */
export const LEAVING_TIME = 0.9;

/** Distância a partir da qual um ponto do trajeto é considerado alcançado. */
export const WAYPOINT_RADIUS = 1.4;

/** Folga entre a parede da construção e onde o personagem pode parar. */
export const WALL_CLEARANCE = 0.6;

/** Se o piloto não avança nada por este tempo, desiste do destino atual. */
export const STUCK_TIMEOUT = 12;

export function initialState(): AutopilotState {
  return { phase: 'leaving', targetId: null, route: [], elapsed: LEAVING_TIME, seen: [] };
}

/**
 * Monta o trajeto até uma construção.
 *
 * Passa pela praça central antes de seguir para o destino. Não é um desvio
 * gratuito: o mundo é gerado garantindo que nada seja colocado sobre os
 * caminhos radiais, então percorrê-los é o jeito de atravessar o mapa sem
 * esbarrar em árvore nenhuma — e é também o caminho que um jogador faria.
 */
export function routeTo(from: Point, zone: Zone, world: WorldData): Point[] {
  const route: Point[] = [];

  const distanceFromCentre = Math.hypot(from.x, from.z);
  const alreadyOnPlaza = distanceFromCentre < world.island.plazaRadius;

  if (!alreadyOnPlaza) {
    route.push({ x: 0, z: 0 });
  }

  const [zx, zz] = zone.position;
  const length = Math.hypot(zx, zz);

  // Onde parar, medido a partir da construção: no meio entre a parede (mais a
  // folga do corpo do personagem) e a borda do gatilho. Uma fração fixa do raio
  // não serve, porque as construções têm tamanhos diferentes — com ela, o
  // piloto parava dentro da parede da oficina, que é a mais larga.
  const halfFootprint = Math.max(zone.building.footprint[0], zone.building.footprint[1]) / 2;
  const nearest = halfFootprint + WALL_CLEARANCE;
  const standoff = (nearest + zone.radius) / 2;

  const stopDistance = Math.max(length - standoff, world.island.plazaRadius);
  route.push({ x: (zx / length) * stopDistance, z: (zz / length) * stopDistance });

  return route;
}

/**
 * Escolhe a próxima construção a visitar.
 *
 * Prefere as que ainda não foram vistas neste ciclo; quando todas já foram,
 * recomeça. Assim o passeio cobre a vila inteira antes de repetir.
 */
export function nextTarget(state: AutopilotState, world: WorldData): Zone | null {
  if (world.zones.length === 0) return null;

  const unseen = world.zones.filter((zone) => !state.seen.includes(zone.sectionId));
  const pool = unseen.length > 0 ? unseen : world.zones;

  // Entre as candidatas, a que não é a atual — para não reabrir a mesma porta.
  const candidates = pool.filter((zone) => zone.sectionId !== state.targetId);
  const chosen = candidates.length > 0 ? candidates : pool;

  return chosen[Math.floor(Math.random() * chosen.length)] ?? null;
}

/** Direção normalizada, em eixos de tela, que leva `from` até `to`. */
export function steer(
  from: Point,
  to: Point,
  screenRight: readonly [number, number],
  screenForward: readonly [number, number],
): { x: number; y: number } {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);

  if (length < 1e-6) return { x: 0, y: 0 };

  const worldX = dx / length;
  const worldZ = dz / length;

  // Projeta a direção do mundo de volta nos eixos da tela. Os eixos são
  // ortonormais, então o produto escalar basta — não é preciso inverter matriz.
  return {
    x: worldX * screenRight[0] + worldZ * screenRight[1],
    y: -(worldX * screenForward[0] + worldZ * screenForward[1]),
  };
}

export function reachedWaypoint(from: Point, to: Point): boolean {
  return Math.hypot(to.x - from.x, to.z - from.z) < WAYPOINT_RADIUS;
}
