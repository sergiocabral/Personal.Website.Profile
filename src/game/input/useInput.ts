import { useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

/**
 * Estado de entrada compartilhado entre teclado e joystick.
 *
 * É um objeto mutável lido dentro do `useFrame`, de propósito: colocar a direção
 * no estado do React faria o componente re-renderizar a cada tecla, o que é caro
 * e desnecessário para algo que só o loop de animação consome.
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (INTERACT_KEYS.has(event.code)) {
        // Espaço rolaria a página; as setas também. Só bloqueamos o que usamos.
        if (event.code === 'Space') event.preventDefault();
        input.current.interact = true;
        return;
      }

      if (MOVE_KEYS[event.code]) {
        event.preventDefault();
        pressed.current.add(event.code);
        setTouch(false);
        recompute();
      }
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
      recompute();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('sc:stick', setStick);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('sc:stick', setStick);
    };
  }, [setTouch]);

  return useMemo(() => ({ input, stick }), []);
}

/** O joystick publica seu vetor por evento, para não acoplar UI e loop do jogo. */
export function emitStick(x: number, y: number): void {
  window.dispatchEvent(new CustomEvent('sc:stick', { detail: { x, y } }));
}
