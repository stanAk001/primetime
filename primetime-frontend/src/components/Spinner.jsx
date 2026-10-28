import { Loader2 } from 'lucide-react';

export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-2.5 text-stone-400" role="status">
      <Loader2 size={20} className="animate-spin text-gold-400" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
