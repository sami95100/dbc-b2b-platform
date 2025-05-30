import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function DBCLogo({ className = "h-8 w-8", onClick, ...props }: { 
  className?: string; 
  onClick?: () => void;
  [key: string]: any 
}) {
  const router = useRouter();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push('/catalog');
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