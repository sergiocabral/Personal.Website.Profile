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

/** Distância da câmera ao alvo. Só afeta o clipping — o zoom controla o tamanho. */
export const CAMERA_DISTANCE = 28;

/** Unidades de mundo visíveis na menor dimensão da tela. Menor = mais perto. */
export const CAMERA_VIEW_SIZE = 22;

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
