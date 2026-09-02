import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faAddressCard, faEnvelope } from '@fortawesome/free-regular-svg-icons';
import {
  faBook,
  faBookBible,
  faBookOpen,
  faCameraRetro,
  faCogs,
  faGlasses,
  faGlobeAmericas,
  faHandHoldingHeart,
  faIdCard,
  faInfinity,
  faLightbulb,
  faMoneyBill,
  faPhoneVolume,
  faSortNumericDown,
} from '@fortawesome/free-solid-svg-icons';
import {
  faDiscord,
  faFacebookF,
  faGitAlt,
  faGithub,
  faInstagram,
  faLinkedin,
  faStackOverflow,
  faTelegram,
  faTwitch,
  faTwitter,
  faWhatsapp,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import type { IconStyle } from '../data/schema';

/**
 * Mapa explícito dos ícones realmente usados.
 *
 * O site anterior fazia `import * as` dos três pacotes e montava o dicionário em
 * runtime, o que impedia o tree-shaking e custava perto de 1 MB de bundle. Aqui
 * cada ícone é uma importação nomeada: o bundler descarta o resto.
 */
const REGISTRY: Record<string, IconDefinition> = {
  'regular:address-card': faAddressCard,
  'regular:envelope': faEnvelope,

  'solid:book': faBook,
  'solid:book-bible': faBookBible,
  'solid:book-open': faBookOpen,
  'solid:camera-retro': faCameraRetro,
  'solid:cogs': faCogs,
  'solid:glasses': faGlasses,
  'solid:globe-americas': faGlobeAmericas,
  'solid:hand-holding-heart': faHandHoldingHeart,
  'solid:id-card': faIdCard,
  'solid:infinity': faInfinity,
  'solid:lightbulb': faLightbulb,
  'solid:money-bill': faMoneyBill,
  'solid:phone-volume': faPhoneVolume,
  'solid:sort-numeric-down': faSortNumericDown,

  'brands:discord': faDiscord,
  'brands:facebook-f': faFacebookF,
  'brands:git-alt': faGitAlt,
  'brands:github': faGithub,
  'brands:instagram': faInstagram,
  'brands:linkedin': faLinkedin,
  'brands:stack-overflow': faStackOverflow,
  'brands:telegram': faTelegram,
  'brands:twitch': faTwitch,
  'brands:twitter': faTwitter,
  'brands:whatsapp': faWhatsapp,
  'brands:youtube': faYoutube,
};

export function getIcon(style: IconStyle, name: string): IconDefinition | null {
  return REGISTRY[`${style}:${name}`] ?? null;
}

/** Nomes registrados, usados pelo script de verificação de conteúdo. */
export const REGISTERED_ICONS = Object.keys(REGISTRY);
