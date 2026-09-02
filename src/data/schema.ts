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
  building: {
    kind: BuildingKind;
    /** Altura do corpo principal, em unidades do mundo. */
    height: number;
    /** Largura e profundidade da base. */
    footprint: Vec2;
    color: string;
    roofColor: string;
    /** Rotação em graus em torno do eixo y. */
    rotation: number;
  };
  /** Direção da fachada, em graus. Acompanha a rotação do prédio. */
  facing: number;
};

export type BuildingKind = 'tower' | 'hall' | 'antenna' | 'board';

export type PropKind = 'tree' | 'lamp' | 'bench' | 'bush' | 'fountain';

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
  ground: {
    size: Vec2;
    color: string;
    pathColor: string;
  };
  spawn: Vec2;
  /** Distância que o personagem pode se afastar do centro antes de ser contido. */
  boundsRadius: number;
  zones: Zone[];
  props: Prop[];
  obstacles: Obstacle[];
};
