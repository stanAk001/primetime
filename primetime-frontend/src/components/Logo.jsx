/**
 * Logo — the Primetime mark: a circle half-hollow, half-gold, standing in
 * for a day turning into night (the site's whole story, 8 AM to 10 PM).
 * It turns like a sundial on hover. Paired with a refined wordmark that
 * echoes the italic-gold accent used on headline emphasis words site-wide.
 */
export default function Logo({ size = 'text-xl', markSize = 30, className = '' }) {
  return (
    <span className={`group inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="shrink-0 text-gold-400 transition-transform duration-700 ease-out group-hover:rotate-180 motion-reduce:group-hover:rotate-0"
      >
        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M16 2 A14 14 0 0 1 16 30 Z" fill="currentColor" />
        <circle cx="16" cy="16" r="2" className="fill-stone-950" />
      </svg>
      <span className="relative">
        <span className={`font-display font-bold tracking-[0.04em] ${size}`}>
          PRIME<span className="italic text-gold-400">TIME</span>
        </span>
        <span
          className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-gold-400/70 transition-transform duration-500 ease-out group-hover:scale-x-100"
          aria-hidden="true"
        />
      </span>
    </span>
  );
}
