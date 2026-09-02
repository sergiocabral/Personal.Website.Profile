import { create } from 'zustand';
import type { Locale } from '../data/schema';
import { detectLocale, persistLocale } from '../i18n/locale';

type GameState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;

  /** Seção cuja zona o personagem está pisando agora, ou null. */
  activeZone: string | null;
  setActiveZone: (sectionId: string | null) => void;

  /** Seção com o diálogo aberto. Enquanto não for null, o jogo fica pausado. */
  openDialog: string | null;
  open: (sectionId: string) => void;
  close: () => void;

  /** Zonas já visitadas nesta sessão, usadas para o progresso do HUD. */
  visited: Set<string>;

  /** true quando o usuário está usando toque, e não teclado. */
  touch: boolean;
  setTouch: (touch: boolean) => void;

  /** Marcado quando o WebGL falha ou o dispositivo é fraco demais. */
  degraded: boolean;
  setDegraded: (degraded: boolean) => void;
};

export const useGameStore = create<GameState>((set, get) => ({
  locale: detectLocale(),
  setLocale: (locale) => {
    persistLocale(locale);
    set({ locale });
  },

  activeZone: null,
  setActiveZone: (sectionId) => {
    // Evita re-render a cada frame: o trigger chama isto direto do useFrame.
    if (get().activeZone !== sectionId) set({ activeZone: sectionId });
  },

  openDialog: null,
  open: (sectionId) =>
    set((state) => ({
      openDialog: sectionId,
      visited: new Set(state.visited).add(sectionId),
    })),
  close: () => set({ openDialog: null }),

  visited: new Set<string>(),

  touch: false,
  setTouch: (touch) => {
    if (get().touch !== touch) set({ touch });
  },

  degraded: false,
  setDegraded: (degraded) => set({ degraded }),
}));

/** Atalho para ler o idioma sem assinar o resto do store. */
export const useLocale = () => useGameStore((state) => state.locale);
