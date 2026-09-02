import photo from '../assets/profile-primary.jpg';
import icon from '../assets/profile-secondary.jpg';

/**
 * Retrato que gira devagar, alternando entre o ícone e a foto.
 *
 * O efeito vem do site anterior e foi recriado aqui: duas imagens sobrepostas,
 * girando juntas, com a de cima aparecendo e sumindo.
 *
 * A ordem importa. O ícone é a identidade — a silhueta em amarelo e preto que
 * as pessoas reconhecem —, então é ele que fica na base e é o primeiro a
 * aparecer. A foto entra por cima, no meio do ciclo, e volta a sair.
 *
 * A lentidão é proposital: quem passa vê um retrato parado, e só quem fica
 * percebe que ele mudou.
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
      <img className="avatar__face avatar__face--icon" src={icon} alt="" />
      <img className="avatar__face avatar__face--photo" src={photo} alt="" />
    </div>
  );
}
