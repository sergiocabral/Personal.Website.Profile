/**
 * Paleta do mundo, inspirada no remake de Link's Awakening.
 *
 * O que faz esse estilo funcionar não é a geometria, é a cor: tons saturados e
 * quentes, sombras que puxam para o roxo em vez do cinza, e pouquíssimos tons
 * por material — cada superfície tem uma cor sólida e no máximo uma variação
 * mais escura. Cinza neutro é o que mata o aspecto de brinquedo, então não há
 * nenhum aqui.
 *
 * Todas as cores vivem neste arquivo para o mundo inteiro poder ser retematizado
 * de uma vez.
 */

export const PALETTE = {
  /** Céu e água — o fundo de tudo. */
  sky: '#8fd9f2',
  skyHorizon: '#cfeffb',
  water: '#39a9d8',
  waterDeep: '#2b7fb5',
  waterFoam: '#bdeaf7',

  /** Terreno. */
  grass: '#79c942',
  grassDark: '#5aa832',
  grassLight: '#96db5c',
  sand: '#f0dca4',
  sandDark: '#dcc184',
  path: '#d8ab6a',
  pathDark: '#c0904f',

  /** Construções. */
  wall: '#f6e7c6',
  wallShade: '#e2cfa8',
  wood: '#a9754a',
  woodDark: '#8a5c38',
  stone: '#b9b3c9',
  stoneDark: '#948da6',

  /** Telhados: uma cor por construção, para servirem de ponto de referência. */
  roofRed: '#e8543c',
  roofBlue: '#4a90d9',
  roofPurple: '#a663cc',
  roofOrange: '#f2933c',

  /** Vegetação. */
  leaf: '#3f9e46',
  leafDark: '#2f7a37',
  leafLight: '#5cba58',
  trunk: '#9c6b43',
  flowerRed: '#ef5d6b',
  flowerYellow: '#ffd85e',
  flowerWhite: '#fdf6e3',

  /** Personagem. */
  tunic: '#3fa845',
  tunicDark: '#2f8035',
  skin: '#f5c9a0',
  hair: '#a0632e',
  boot: '#8a5c38',

  /** Destaques, herdados do site anterior. */
  accent: '#1AF1F2',
  brand: '#FFD602',
} as const;

/**
 * Cor de luz. Uma direcional cálida e um hemisfério frio: é o contraste entre as
 * duas que dá volume sem precisar de shadow map em cada objeto.
 */
export const LIGHT = {
  sun: '#fff4d6',
  skyBounce: '#bfe6ff',
  groundBounce: '#5c8f3a',
} as const;
