import type { Locale, Localized } from './schema';
import { content } from './index';
import { pick } from '../i18n/locale';

/**
 * Idade em anos completos. A bio antiga trazia o número escrito à mão, o que
 * obrigava a lembrar de atualizar o site todo aniversário; agora ela sai daqui.
 */
export function ageFrom(birthDate: string, today = new Date()): number {
  const born = new Date(birthDate);
  let age = today.getFullYear() - born.getFullYear();

  const hadBirthday =
    today.getMonth() > born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() >= born.getDate());

  if (!hadBirthday) age -= 1;
  return age;
}

/** Substitui os marcadores dinâmicos suportados no texto do conteúdo. */
export function interpolate(text: string): string {
  return text.replace('{age}', String(ageFrom(content.profile.birthDate)));
}

/** Localiza e interpola de uma vez — o caminho usado por toda a interface. */
export function text(value: Localized, locale: Locale): string {
  return interpolate(pick(value, locale));
}
