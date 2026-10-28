import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

const navLinkClass = ({ isActive }) =>
  `rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
    isActive ? 'text-gold-300' : 'text-stone-300 hover:text-gold-300'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Slide the bar away while scrolling down, bring it back on scroll up.
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 140 && !open);
    setScrolled(y > 24);
  });

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    setOpen(false);
    navigate('/');
  };

  const close = () => setOpen(false);

  return (
    <motion.header
      animate={{ y: hidden ? '-100%' : '0%' }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-300 ${
        scrolled
          ? 'border-stone-800/70 bg-stone-950/85'
          : 'border-transparent bg-stone-950/30'
      }`}>
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" onClick={close} aria-label="Primetime home">
          <Logo />
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          <NavLink to="/facilities" className={navLinkClass}>
            Facilities
          </NavLink>
          <NavLink to="/match-nights" className={navLinkClass}>
            Match nights
          </NavLink>
          {user && (
            <NavLink to="/dashboard" className={navLinkClass}>
              My bookings
            </NavLink>
          )}
          {user?.isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
          {user ? (
            <div className="ml-3 flex items-center gap-3">
              <span className="text-sm text-stone-400">
                Hi, <span className="text-stone-200">{user.firstName}</span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-outline !min-h-9 !px-4 !py-1.5 text-sm"
              >
                <LogOut size={15} aria-hidden="true" />
                Log out
              </button>
            </div>
          ) : (
            <div className="ml-3 flex items-center gap-2">
              <Link to="/login" className="btn-outline !min-h-9 !px-4 !py-1.5 text-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn-gold !min-h-9 !px-4 !py-1.5 text-sm">
                Join now
              </Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-stone-200 transition-colors hover:text-gold-300 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </nav>

      {/* Mobile panel */}
      {open && (
        <div className="border-t border-stone-800/70 bg-stone-950 px-4 pb-5 pt-3 md:hidden">
          <div className="flex flex-col gap-1">
            <NavLink to="/facilities" className={navLinkClass} onClick={close}>
              Facilities
            </NavLink>
            {user && (
              <NavLink to="/dashboard" className={navLinkClass} onClick={close}>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={15} aria-hidden="true" /> My bookings
                </span>
              </NavLink>
            )}
            {user?.isAdmin && (
              <NavLink to="/admin" className={navLinkClass} onClick={close}>
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={15} aria-hidden="true" /> Admin
                </span>
              </NavLink>
            )}
            <div className="mt-3 flex flex-col gap-2">
              {user ? (
                <button type="button" onClick={handleLogout} className="btn-outline">
                  <LogOut size={16} aria-hidden="true" />
                  Log out
                </button>
              ) : (
                <>
                  <Link to="/login" className="btn-outline" onClick={close}>
                    Sign in
                  </Link>
                  <Link to="/register" className="btn-gold" onClick={close}>
                    Join now
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.header>
  );
}
