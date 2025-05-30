import Image from 'next/image';

export default function DBCLogo({ className = "h-8 w-8", ...props }: { className?: string; [key: string]: any }) {
  return (
    <div className={className} {...props}>
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