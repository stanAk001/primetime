import { Link } from 'react-router-dom';
import { MapPin, Phone } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="border-t border-stone-800/70 bg-stone-950">
      {/* Two columns on a phone. The brand block spans both — it's the
          masthead, not a third list — and the two link columns sit beside
          each other beneath it rather than stacking into a long ribbon of
          left-aligned text. */}
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:px-6 sm:py-12 md:grid-cols-3 md:gap-8">
        <div className="col-span-2 md:col-span-1">
          <Logo size="text-lg" markSize={26} />
          <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-pretty text-stone-400 md:max-w-xs">
            Ibadan's premier entertainment &amp; hospitality complex. One venue,
            endless prime time.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-200 sm:text-sm sm:tracking-normal sm:normal-case">
            Explore
          </p>
          <ul className="mt-3 space-y-2 text-sm text-stone-400">
            <li>
              <Link to="/facilities" className="transition-colors hover:text-gold-300">
                All facilities
              </Link>
            </li>
            <li>
              <Link to="/match-nights" className="transition-colors hover:text-gold-300">
                Match nights
              </Link>
            </li>
            <li>
              <Link to="/register" className="transition-colors hover:text-gold-300">
                Become a member
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="transition-colors hover:text-gold-300">
                My bookings
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-200 sm:text-sm sm:tracking-normal sm:normal-case">
            Visit us
          </p>
          <ul className="mt-3 space-y-2 text-sm text-stone-400">
            {/* items-start, not items-center: the address wraps to two lines
                in a narrow column and a centred icon drifts to the middle
                of the block. */}
            <li className="flex items-start gap-2">
              <MapPin size={15} className="mt-0.5 shrink-0 text-gold-400" aria-hidden="true" />
              Primetime Complex, Ibadan, Nigeria
            </li>
            <li className="flex items-start gap-2">
              <Phone size={15} className="mt-0.5 shrink-0 text-gold-400" aria-hidden="true" />
              <a
                href="tel:+234800774638463"
                className="transition-colors hover:text-gold-300"
              >
                +234 800 PRIMETIME
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-800/70 py-4 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} Primetime. All rights reserved.
      </div>
    </footer>
  );
}
