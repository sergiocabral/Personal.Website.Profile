/** Direção da câmera, normalizada. Multiplicada pela distância vira a posição. */
export const CAMERA_DIRECTION: [number, number, number] = [1, 1.15, 1];

/**
 * Eixos da tela projetados no chão, derivados da posição da câmera.
 *
 * São calculados a partir de CAMERA_DIRECTION em vez de um ângulo escrito à mão:
 * assim, mudar o ângulo da câmera nunca dessincroniza os controles. Antes havia
 * um yaw fixo aqui, com o sinal trocado — a seta para cima andava para a direita.
 *
 * FORWARD é a direção que se afasta da câmera (o "para cima" da tela) e RIGHT é
 * o produto vetorial dela com o eixo vertical.
 */
const GROUND_LENGTH = Math.hypot(CAMERA_DIRECTION[0], CAMERA_DIRECTION[2]);

export const SCREEN_FORWARD: [number, number] = [
  -CAMERA_DIRECTION[0] / GROUND_LENGTH,
  -CAMERA_DIRECTION[2] / GROUND_LENGTH,
];

export const SCREEN_RIGHT: [number, number] = [-SCREEN_FORWARD[1], SCREEN_FORWARD[0]];

/**
 * Campo de visão, em graus.
 *
 * Bem estreito de propósito. Uma lente longa comprime a profundidade e é
 * justamente isso que faz uma cena parecer uma maquete fotografada de perto —
 * o mesmo princípio da fotografia tilt-shift. Uma câmera ortográfica pura
 * daria a leitura de mapa, mas perderia esse efeito e impediria a
 * profundidade de campo, que aqui é o acabamento principal.
 */
export const CAMERA_FOV = 26;

/** Unidades de mundo enquadradas na menor dimensão da tela. Menor = mais perto. */
export const CAMERA_VIEW_SIZE = 26;

/** Distância mínima, para telas muito largas não deixarem a câmera dentro do chão. */
export const CAMERA_MIN_DISTANCE = 34;

/** Velocidade máxima do personagem, em unidades por segundo. */
export const PLAYER_SPEED = 5.6;

/** Constantes de suavização: quanto maior, mais responsivo e menos "no gelo". */
export const PLAYER_ACCEL = 12;
export const PLAYER_FRICTION = 14;

/** Raio de colisão do personagem. */
export const PLAYER_RADIUS = 0.45;

/** Altura do centro do personagem em relação ao chão. */
export const PLAYER_HEIGHT = 0.9;

/** Quanto a câmera "persegue" o alvo. Maior = gruda mais. */
export const CAMERA_DAMPING = 4.5;

/** Suavização da rotação do personagem ao mudar de direção. */
export const TURN_DAMPING = 12;

/**
 * A zona fecha a `radius * ZONE_HYSTERESIS`, não a `radius`.
 * Sem essa folga o prompt pisca quando o jogador para exatamente na borda.
 */
export const ZONE_HYSTERESIS = 1.22;
