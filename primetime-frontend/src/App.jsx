import { Suspense, lazy } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import Preloader from './components/Preloader';
import MobileDock from './components/MobileDock';
import Spinner from './components/Spinner';
import { EASE } from './components/motionKit';
import Landing from './pages/Landing';
import Facilities from './pages/Facilities';
import FacilityDetail from './pages/FacilityDetail';
import Login from './pages/Login';
import Register from './pages/Register';

// Signed-in-only screens, split out of the first-load bundle — a visitor
// landing on the marketing pages over mobile data shouldn't be paying for
// the QR encoder (Dashboard), the scanner-gun decoder (Scan), or the admin
// charts before they've even signed up.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Checkout = lazy(() => import('./pages/Checkout'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const Admin = lazy(() => import('./pages/Admin'));
const Scan = lazy(() => import('./pages/Scan'));
const GymJoin = lazy(() => import('./pages/GymJoin'));
const Menu = lazy(() => import('./pages/Menu'));
const MatchNight = lazy(() => import('./pages/MatchNight'));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-display text-6xl font-bold text-gold-400">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold">Page not found</h1>
      <Link to="/" className="btn-outline mt-6">
        Back home
      </Link>
    </div>
  );
}

export default function App() {
  const location = useLocation();

  // The front-desk scanner runs as its own kiosk-style screen — no
  // navbar/footer/preloader, nothing for staff to accidentally tap away
  // into while it needs to stay focused for scanner-gun input all day.
  if (location.pathname === '/scan') {
    return (
      <ProtectedRoute adminOnly>
        <Suspense fallback={<RouteFallback />}>
          <Scan />
        </Suspense>
      </ProtectedRoute>
    );
  }

  // Same treatment for the table menu: it's reached by scanning a QR code at
  // the table, so it carries its own header and no site chrome.
  if (location.pathname === '/menu') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Menu />
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Preloader />
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <Suspense fallback={<RouteFallback />}>
              <Routes location={location}>
                <Route path="/" element={<Landing />} />
                <Route path="/facilities" element={<Facilities />} />
                <Route path="/match-nights" element={<MatchNight />} />
                <Route path="/facilities/:slug" element={<FacilityDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/gym/join"
                  element={
                    <ProtectedRoute>
                      <GymJoin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout/:bookingId"
                  element={
                    <ProtectedRoute>
                      <Checkout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/payment/success"
                  element={
                    <ProtectedRoute>
                      <PaymentSuccess />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute adminOnly>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      {/* Phone navigation. The footer gets clearance so the dock never
          covers the last line of the page. */}
      <div className="h-20 md:hidden" aria-hidden="true" />
      <MobileDock />
    </div>
  );
}
