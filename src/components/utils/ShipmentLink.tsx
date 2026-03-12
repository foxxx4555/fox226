import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShipmentLinkProps {
  id: string;
  className?: string;
  showHash?: boolean;
  shorten?: boolean;
}

export const ShipmentLink = ({ id, className, showHash = true, shorten = true }: ShipmentLinkProps) => {
  if (!id) return null;
  
  const displayId = shorten ? id.substring(0, 8).toUpperCase() : id.toUpperCase();
  
  const isAdmin = window.location.pathname.startsWith('/admin');
  const targetPath = isAdmin ? `/admin/loads?search=${id}` : `/loads/${id}`;
  
  return (
    <Link 
      to={targetPath}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all font-black text-[10px] shadow-sm active:scale-95 border border-blue-100/50",
        className
      )}
    >
      <ExternalLink size={10} />
      <span>{showHash ? '#' : ''}{displayId}</span>
    </Link>
  );
};
