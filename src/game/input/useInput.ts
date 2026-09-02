import { useEffect, useMemo, useRef } from 'react';
import { IDLE_BEFORE_AUTOPLAY, useGameStore } from '../../store/gameStore';

/**
 * Estado de entrada compartilhado entre teclado, joystick e piloto automático.
 *
 * É um objeto mutável lido dentro do `useFrame`, de propósito: colocar a direção
 * no estado do React faria o componente re-renderizar a cada tecla, o que é caro
 * e desnecessário para algo que só o loop de animação consome.
 *
 * Os três controles escrevem no mesmo objeto, então o personagem não precisa
 * saber quem o está movendo.
 */
export type InputState = {
  /** Direção desejada no plano do chão, já normalizada. Comprimento 0 ou 1. */
  x: number;
  y: number;
  /** Sobe para true no frame em que a tecla de interação é pressionada. */
  interact: boolean;
};

const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

const INTERACT_KEYS = new Set(['KeyE', 'Enter', 'Space']);

export function useInput() {
  const input = useRef<InputState>({ x: 0, y: 0, interact: false });
  const pressed = useRef(new Set<string>());
  /** Vetor vindo do joystick, mantido à parte para não brigar com o teclado. */
  const stick = useRef({ x: 0, y: 0 });

  const setTouch = useGameStore((state) => state.setTouch);

  useEffect(() => {
    const recompute = () => {
      let x = stick.current.x;
      let y = stick.current.y;

      for (const code of pressed.current) {
        const delta = MOVE_KEYS[code];
        if (delta) {
          x += delta[0];
          y += delta[1];
        }
      }

      const length = Math.hypot(x, y);
      if (length > 1) {
        x /= length;
        y /= length;
      }

      input.current.x = x;
      input.current.y = y;
    };

    /**
     * Qualquer comando do visitante interrompe o passeio automático e reinicia a
     * contagem de inatividade.
     */
    let idleTimer = 0;

    const scheduleAutoplay = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        useGameStore.getState().releaseControl();
      }, IDLE_BEFORE_AUTOPLAY);
    };

    const takeOver = () => {
      const store = useGameStore.getState();
      if (store.auto) {
        // Zera o comando que o piloto tinha deixado, senão o personagem
        // continuaria andando sozinho por um instante.
        input.current.x = 0;
        input.current.y = 0;
        store.takeControl();
      }
      scheduleAutoplay();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (INTERACT_KEYS.has(event.code)) {
        // Espaço rolaria a página; as setas também. Só bloqueamos o que usamos.
        if (event.code === 'Space') event.preventDefault();
        takeOver();
        input.current.interact = true;
        return;
      }

      if (MOVE_KEYS[event.code]) {
        event.preventDefault();
        takeOver();
        pressed.current.add(event.code);
        setTouch(false);
        recompute();
        return;
      }

      // Outras teclas (Tab, Esc, setas dentro do diálogo) não assumem o
      // controle, mas contam como sinal de vida.
      scheduleAutoplay();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (pressed.current.delete(event.code)) recompute();
    };

    /** Sem isto, trocar de aba com a tecla apertada deixa o personagem andando sozinho. */
    const onBlur = () => {
      pressed.current.clear();
      recompute();
    };

    const setStick = (event: Event) => {
      const detail = (event as CustomEvent<{ x: number; y: number }>).detail;
      stick.current = detail;
      if (detail.x !== 0 || detail.y !== 0) takeOver();
      recompute();
    };

    const onPointerDown = () => scheduleAutoplay();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('sc:stick', setStick);
    window.addEventListener('pointerdown', onPointerDown);

    return () => {
      window.clearTimeout(idleTimer);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('sc:stick', setStick);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [setTouch]);

  return useMemo(() => ({ input, stick }), []);
}

/** O joystick publica seu vetor por evento, para não acoplar UI e loop do jogo. */
export function emitStick(x: number, y: number): void {
  window.dispatchEvent(new CustomEvent('sc:stick', { detail: { x, y } }));
}

/**
 * Assume o controle a partir da interface (o botão de interagir, por exemplo).
 * Mantém o comportamento igual ao de um comando pelo teclado.
 */
export function takeControlFromUi(): void {
  useGameStore.getState().takeControl();
}
