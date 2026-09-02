/**
 * Tipos da fonte única de verdade do site.
 *
 * O conteúdo vive em `content.json` (o que é dito) e o layout do mundo 3D em
 * `world.json` (onde as coisas ficam). São arquivos separados porque mudam por
 * motivos diferentes: um link novo mexe só no conteúdo; remodelar o mapa mexe só
 * no mundo. A ligação entre os dois é a chave `Section.id` <-> `Zone.sectionId`.
 */

export const LOCALES = ['pt-BR', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Texto com uma variante por idioma. */
export type Localized = Record<Locale, string>;

export type IconStyle = 'solid' | 'regular' | 'brands';

export type Link = {
  name: string;
  url: string;
  /** Nome do ícone FontAwesome, sem prefixo. Ex.: 'github'. */
  icon: string;
  iconStyle: IconStyle;
  /** Legenda curta exibida abaixo do nome no diálogo. */
  description?: Localized;
};

export type Section = {
  /** Chave estável que liga esta seção a uma zona do mundo 3D. */
  id: string;
  label: Localized;
  icon: string;
  iconStyle: IconStyle;
  dialog: {
    /** Primeira fala, exibida com efeito de máquina de escrever. */
    greeting: Localized;
    /**
     * Corpo em Markdown reduzido: parágrafos separados por linha em branco,
     * `**negrito**` e `[texto](url)`. Ver `src/ui/markdown.tsx`.
     */
    body?: Localized;
  };
  links: Link[];
};

export type ContentData = {
  profile: {
    name: string;
    /** Data de nascimento ISO. A idade na bio é derivada daqui, nunca escrita à mão. */
    birthDate: string;
    /** Ano em que começou a programar. Alimenta o marcador {codingYears}. */
    codingSince: number;
    /** Ano em que começou a ensinar. Alimenta o marcador {teachingYears}. */
    teachingSince: number;
    role: Localized;
    url: string;
    siteName: string;
    seo: {
      title: Localized;
      description: Localized;
      ogImage: string;
    };
  };
  theme: {
    /** Cor da barra do navegador (meta theme-color). */
    browserColor: string;
    /** Cor de destaque/brilho, herdada do site anterior. */
    accentColor: string;
  };
  sections: Section[];
};

/** Coordenada no plano do chão (x, z). O eixo y é a altura. */
export type Vec2 = [number, number];

export type Zone = {
  sectionId: string;
  position: Vec2;
  /** Raio de entrada do gatilho. A saída usa este raio multiplicado pela histerese. */
  radius: number;
  /** Direção da fachada, em graus. Sempre voltada para a praça central. */
  facing: number;
  building: {
    kind: BuildingKind;
    /** Altura do corpo principal, em unidades do mundo. */
    height: number;
    /** Largura e profundidade da base. */
    footprint: Vec2;
    /** Chaves da paleta em `src/game/palette.ts`, não valores hexadecimais. */
    color: PaletteKey;
    roofColor: PaletteKey;
    /** Rotação em graus em torno do eixo y. */
    rotation: number;
  };
};

/** Nome de uma cor da paleta. Mantém o tema num lugar só. */
export type PaletteKey = string;

export type BuildingKind = 'house' | 'workshop' | 'tower' | 'signboard';

export type PropKind = 'tree' | 'bush' | 'flower' | 'rock' | 'lamp' | 'bench' | 'fountain';

export type Prop = {
  kind: PropKind;
  position: Vec2;
  /** Variação de escala para o mesmo modelo não parecer copiado e colado. */
  scale?: number;
  rotation?: number;
};

/** Caixa alinhada aos eixos no plano XZ, usada só para colisão. */
export type Obstacle = {
  position: Vec2;
  /** Largura (x) e profundidade (z) totais, não meias-medidas. */
  size: Vec2;
  /**
   * Rotação em graus. Os prédios são rotacionados, então o colisor precisa
   * acompanhar — senão o personagem atravessa as quinas visivelmente.
   */
  rotation?: number;
};

export type WorldData = {
  island: {
    /** Onde a grama termina e começa a areia da praia. */
    grassRadius: number;
    /** Onde a areia termina e começa a água. */
    sandRadius: number;
    /** Raio do plano de água, só para preencher o horizonte. */
    waterRadius: number;
    /** Praça central: a área calçada de onde saem os caminhos. */
    plazaRadius: number;
    /**
     * Anel livre em volta da fonte, dentro da praça.
     *
     * É por ele que se contorna a fonte para passar de um caminho a outro. O
     * gerador do mundo garante que nada com colisão o ocupe.
     */
    plazaRing: number;
  };
  spawn: Vec2;
  /** Distância que o personagem pode se afastar do centro antes de ser contido. */
  boundsRadius: number;
  zones: Zone[];
  props: Prop[];
  obstacles: Obstacle[];
};
