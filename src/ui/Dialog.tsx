import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { sectionById, content } from '../data';
import { text } from '../data/derive';
import { pick } from '../i18n/locale';
import { t } from '../i18n/ui';
import { useGameStore, useLocale } from '../store/gameStore';
import { getIcon } from './icons';
import { LinkList } from './LinkList';
import { Markdown } from './markdown';
import { RotatingAvatar } from './RotatingAvatar';

/**
 * Diálogo estilo RPG, em HTML sobre o canvas.
 *
 * É HTML e não um painel dentro da cena 3D por um motivo prático: ordem de foco,
 * leitor de tela, seleção de texto e "abrir em nova aba" nos links vêm de graça,
 * e nenhum deles existe dentro de um canvas WebGL.
 */
export function Dialog() {
  const openDialog = useGameStore((state) => state.openDialog);
  const closeDialog = useGameStore((state) => state.close);
  const takeControl = useGameStore((state) => state.takeControl);

  // Fechar é um comando do visitante: interrompe o passeio automático junto.
  const close = useCallback(() => {
    takeControl();
    closeDialog();
  }, [takeControl, closeDialog]);
  const locale = useLocale();

  const panel = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<Element | null>(null);

  const section = openDialog ? sectionById.get(openDialog) : undefined;

  useEffect(() => {
    if (!section) return;

    returnFocus.current = document.activeElement;
    panel.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab' || !panel.current) return;

      // Prende o foco: sem isto o Tab escapa para a barra do navegador e o
      // usuário de teclado perde o diálogo de vista.
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus();
    };
  }, [section, close]);

  if (!section) return null;

  const icon = getIcon(section.iconStyle, section.icon);
  const label = pick(section.label, locale);

  return (
    <div
      className="dialog-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="dialog frame"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
      >
        <header className="dialog__header">
          <RotatingAvatar size="3.2rem" />
          <div className="dialog__title">
            <h2 id="dialog-title">
              {icon ? <FontAwesomeIcon icon={icon} aria-hidden="true" /> : null}
              {label}
            </h2>
            <p>{content.profile.name}</p>
          </div>
          <button
            type="button"
            className="dialog__close"
            onClick={close}
            aria-label={t('close', locale)}
          >
            ✕
          </button>
        </header>

        <div className="dialog__body">
          {/* A `key` remonta o componente quando a fala muda, o que reinicia a
              animação sem precisar de um setState dentro do efeito. */}
          <Typewriter
            key={`${section.id}-${locale}`}
            text={text(section.dialog.greeting, locale)}
          />

          {section.dialog.body ? (
            <Markdown className="dialog__prose" text={text(section.dialog.body, locale)} />
          ) : null}

          <LinkList links={section.links} locale={locale} />
        </div>
      </div>
    </div>
  );
}

/**
 * Efeito de máquina de escrever.
 *
 * O texto animado é `aria-hidden` e existe uma cópia completa só para o leitor
 * de tela: revelar caractere a caractere faz o leitor gaguejar e repetir a
 * frase inteira a cada atualização.
 */
function Typewriter({ text: full }: { text: string }) {
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [count, setCount] = useState(() => (reduced ? full.length : 0));

  useEffect(() => {
    if (reduced) return;

    const timer = window.setInterval(() => {
      setCount((current) => {
        if (current >= full.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 18);

    return () => window.clearInterval(timer);
  }, [full, reduced]);

  const skip = useCallback(() => setCount(full.length), [full.length]);

  useEffect(() => {
    if (count >= full.length) return;
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    return () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [count, full.length, skip]);

  const done = count >= full.length;

  return (
    <>
      <p className="dialog__greeting" aria-hidden="true">
        {full.slice(0, count)}
        {done ? null : <span className="dialog__caret" />}
      </p>
      <p className="visually-hidden">{full}</p>
    </>
  );
}
