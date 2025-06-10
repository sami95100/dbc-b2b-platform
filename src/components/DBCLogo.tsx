import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { DEFAULT_ROUTES } from '../lib/routes-config';

export default function DBCLogo({ className = "h-8 w-8", onClick, ...props }: { 
  className?: string; 
  onClick?: () => void;
  [key: string]: any 
}) {
  const router = useRouter();
  const { isAdmin, isClient } = useAuth();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Rediriger vers la page d'accueil selon le rôle
      if (isAdmin) {
        router.push(DEFAULT_ROUTES.admin);
      } else if (isClient) {
        router.push(DEFAULT_ROUTES.client);
      } else {
        router.push('/');
      }
    }
  };

  return (
    <div 
      className={`${className} cursor-pointer`} 
      onClick={handleClick}
      {...props}
    >
      <Image
        src="/logo-dbc.png"
        alt="DBC Logo"
        width={32}
        height={32}
        className="w-full h-full object-contain"
        priority
      />
    </div>
  );
} 