const STATUS_STYLES = {
  pending: {
    label: 'Pending payment',
    className: 'border-gold-400/40 bg-gold-400/10 text-gold-300',
  },
  confirmed: {
    label: 'Confirmed',
    className: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'border-stone-600 bg-stone-800/60 text-stone-400',
  },
  completed: {
    label: 'Completed',
    className: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${style.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {style.label}
    </span>
  );
}
