import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useMenu } from '../api/hooks';
import { getApiError } from '../api/client';
import Logo from '../components/Logo';
import MenuList from '../components/MenuList';
import OrderBar from '../components/OrderBar';
import OfflineBanner from '../components/OfflineBanner';
import Spinner from '../components/Spinner';
import { CartProvider } from '../context/CartContext';
import { FlyToCartProvider } from '../context/FlyToCartContext';

/**
 * The page behind the QR code on each table.
 *
 * Deliberately standalone — no navbar, no footer, no preloader. Someone who
 * scanned a code at their table wants the list and a way to be served, not
 * the marketing site; the /scan kiosk screen takes the same approach.
 *
 * ?table=12 comes from the printed code, which makes calling a waiter a
 * single tap with nothing to type.
 */
export default function Menu() {
  const [params] = useSearchParams();
  const table = params.get('table') ?? '';
  const { data: menu, isLoading, isError, error, refetch } = useMenu('bar-lounge');

  return (
    <CartProvider>
    <FlyToCartProvider>
    <div className="min-h-dvh bg-stone-950 pb-36">
      <OfflineBanner />
      <header className="border-b border-stone-800/70 bg-stone-950/90 px-4 py-5 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="hidden sm:block">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                Bar Lounge
              </p>
              <p className="font-display text-lg font-bold leading-tight">Menu</p>
            </div>
          </div>
          {table ? (
            <span className="rounded-full border border-gold-400/40 bg-gold-400/15 px-4 py-1.5 text-sm font-semibold text-gold-200">
              Table {table}
            </span>
          ) : (
            <Link
              to="/facilities/bar-lounge"
              className="inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-gold-300"
            >
              <ArrowLeft size={15} aria-hidden="true" /> The lounge
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="max-w-[14ch] font-display text-[1.75rem] font-bold leading-[1.15] text-balance sm:max-w-none sm:text-5xl sm:leading-tight">
          What are we <span className="italic text-gold-300">pouring?</span>
        </h1>
        <p className="mt-3 max-w-[40ch] text-sm text-pretty text-stone-400 sm:max-w-lg sm:text-base">
          Wine, spirits and cold beer at the bar; suya, pepper soup and the
          grill off the fire. Build your order, send it to the bar, and settle
          the bill at your table — no booking, no card up front.
        </p>

        <div className="mt-8">
          {isLoading ? (
            <div className="flex justify-center py-24">
              <Spinner label="Loading the menu…" />
            </div>
          ) : isError ? (
            <div className="card mx-auto max-w-md p-8 text-center">
              <p className="text-stone-300">We couldn't load the menu.</p>
              <p className="mt-2 text-sm text-red-400/90">{getApiError(error)}</p>
              <button type="button" onClick={() => refetch()} className="btn-outline mt-4">
                <RotateCcw size={16} aria-hidden="true" /> Try again
              </button>
            </div>
          ) : (
            <MenuList menu={menu} />
          )}
        </div>

        <p className="mt-12 text-center text-xs text-stone-600">
          Prices in naira and include VAT · Primetime Complex, Ibadan
        </p>
      </main>

      <OrderBar facilitySlug="bar-lounge" table={table} />
    </div>
    </FlyToCartProvider>
    </CartProvider>
  );
}
