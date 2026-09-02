import primary from '../assets/profile-primary.jpg';
import secondary from '../assets/profile-secondary.jpg';

/**
 * Avatar que gira devagar alternando entre duas fotos.
 *
 * O efeito vem do site anterior e foi recriado aqui: duas imagens sobrepostas,
 * uma girando continuamente e a de cima aparecendo e sumindo, com um halo na
 * cor de destaque. A graça está na lentidão — quem chega vê uma foto parada, e
 * só quem fica percebe que ela mudou.
 *
 * A rotação para inteira com `prefers-reduced-motion`, mas a troca de foto
 * continua: ela é lenta o bastante para não incomodar quem pediu menos
 * movimento, e é o que dá vida ao retrato.
 */
export function RotatingAvatar({
  size = '5.5rem',
  className,
}: {
  size?: string;
  className?: string;
}) {
  return (
    <div
      className={`avatar${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
    >
      <img className="avatar__face avatar__face--primary" src={primary} alt="" />
      <img className="avatar__face avatar__face--secondary" src={secondary} alt="" />
    </div>
  );
}
