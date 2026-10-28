import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import jsQR from 'jsqr';
import { AnimatePresence, motion } from 'motion/react';
import {
  CameraOff,
  CheckCircle2,
  Flame,
  History,
  LogOut,
  ScanLine,
  Target,
  XCircle,
} from 'lucide-react';
import { useVerifyMembershipQr } from '../api/hooks';
import { goalLabel } from '../lib/constants';
import { EASE } from '../components/motionKit';

// Don't let a member's own held-up phone re-trigger the same scan
// repeatedly while it's still in frame.
const RESCAN_COOLDOWN_MS = 4000;

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'PT';

const shortDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

// Names are never truncated — they wrap, and the type steps down so even
// a long double-barrelled name sits comfortably on two lines.
const nameSizeClass = (name = '') => {
  const longestWord = Math.max(...name.split(/\s+/).map((w) => w.length), 0);
  if (name.length <= 16 && longestWord <= 12) return 'text-2xl sm:text-3xl';
  if (name.length <= 28 && longestWord <= 15) return 'text-xl sm:text-2xl';
  return 'text-lg sm:text-xl';
};

const relativeDay = (ts) => {
  if (!ts) return 'First visit';
  const days = Math.floor((Date.now() - new Date(ts).getTime()) / 86_400_000);
  if (days <= 0) return 'Earlier today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return shortDate(ts);
};

function Fact({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-black/25 px-3 py-2 text-left">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">{label}</p>
      <p className="mt-0.5 text-sm font-semibold leading-tight text-white">{value}</p>
      {sub && <p className="text-[11px] text-white/70">{sub}</p>}
    </div>
  );
}

// Staff acknowledge every result explicitly — the card never disappears
// on its own.
function OkButton({ onDismiss }) {
  return (
    <div className="mt-auto pt-4">
      <button
        type="button"
        onClick={onDismiss}
        className="h-14 w-full cursor-pointer rounded-2xl bg-white font-display text-xl font-bold text-stone-900 shadow-lg shadow-black/20 transition-transform duration-150 active:scale-[0.97]"
      >
        OK
      </button>
    </div>
  );
}

// The full front-desk pass: who they are, how long their plan runs,
// how often they show up, and what they're training for.
function ResultCard({ result, onDismiss }) {
  const m = result.member;
  if (result.error || !m) {
    return (
      <div className="flex h-full w-full flex-col px-5 py-4">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <XCircle size={52} aria-hidden="true" />
          <p className="font-display text-2xl font-bold">
            {result.error ? "Couldn't check card" : 'Not recognized'}
          </p>
          <p className="text-sm text-white/80">
            {result.error ? 'Try scanning again' : "This card isn't in the system"}
          </p>
        </div>
        <OkButton onDismiss={onDismiss} />
      </div>
    );
  }

  const daysLeft = Number(m.daysLeft);
  const planDays = Number(m.planDays) || 1;
  const remainingPct = Math.max(0, Math.min(1, daysLeft / planDays));

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto px-5 py-4 text-left">
      {/* Verdict strip */}
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]">
          {result.valid ? (
            <>
              <CheckCircle2 size={16} aria-hidden="true" /> Access granted
            </>
          ) : (
            <>
              <XCircle size={16} aria-hidden="true" /> No access
            </>
          )}
        </p>
        {result.checkedInAt && (
          <p className="text-xs text-white/80">
            Checked in{' '}
            {new Date(result.checkedInAt).toLocaleTimeString('en-NG', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {/* Identity */}
      <div className="mt-4 flex items-center gap-4">
        {m.photo ? (
          <img
            src={m.photo}
            alt=""
            className="h-16 w-16 rounded-2xl border-2 border-white/40 object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/40 bg-black/25 font-display text-2xl font-bold">
            {initials(m.name)}
          </span>
        )}
        <div className="min-w-0">
          <p
            className={`break-words font-display font-bold leading-tight ${nameSizeClass(
              m.name
            )}`}
          >
            {m.name || 'Member'}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-white/85">
            <span className="rounded-full bg-black/25 px-2.5 py-0.5 font-medium">{m.plan}</span>
            {m.memberSince && <span>Member since {shortDate(m.memberSince)}</span>}
          </p>
        </div>
      </div>

      {result.valid ? (
        <>
          {/* Plan window */}
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-xs text-white/80">
              <span>
                {daysLeft === 0 ? (
                  <span className="font-display text-lg font-bold text-white">Last day</span>
                ) : (
                  <>
                    <span className="font-display text-lg font-bold text-white">
                      {Number.isFinite(daysLeft) ? daysLeft : '—'}
                    </span>{' '}
                    day{daysLeft === 1 ? '' : 's'} left
                  </>
                )}
              </span>
              <span>expires {shortDate(m.expiresAt)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/30">
              <motion.div
                className="h-full rounded-full bg-white"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: remainingPct }}
                style={{ originX: 0 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
              />
            </div>
          </div>

          {/* Attendance + profile facts */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Fact
              label="Visits"
              value={m.visits?.total ?? 0}
              sub={`${m.visits?.thisWeek ?? 0} this week`}
            />
            <Fact
              label="Last visit"
              value={m.visits?.total ? relativeDay(m.visits?.lastVisit) : 'First visit'}
            />
            <Fact
              label="Weight"
              value={m.weightKg ? `${Number(m.weightKg)} kg` : '—'}
              sub={m.targetWeightKg ? `goal ${Number(m.targetWeightKg)} kg` : undefined}
            />
          </div>

          {/* Training goals — what this member is here for */}
          {m.goals?.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-1.5">
              <Target size={13} className="text-white/70" aria-hidden="true" />
              {m.goals.slice(0, 4).map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-white/30 bg-black/20 px-2.5 py-0.5 text-[11px] font-medium"
                >
                  {goalLabel(g)}
                </span>
              ))}
            </p>
          )}
        </>
      ) : (
        <div className="mt-5 space-y-2 rounded-2xl bg-black/25 p-4">
          <p className="flex items-center gap-2 font-semibold">
            <History size={16} aria-hidden="true" />
            {m.status === 'pending'
              ? 'Payment not confirmed'
              : `Expired ${
                  Number.isFinite(daysLeft) && daysLeft < 0
                    ? `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago`
                    : ''
                }`}
          </p>
          <p className="text-sm text-white/85">
            {m.status === 'pending'
              ? 'The plan was reserved but never paid for — they can finish payment on their phone in a minute.'
              : `${m.plan} ran out on ${shortDate(m.expiresAt)}. Renewing takes two minutes on their phone — plans are already unlocked.`}
          </p>
          {m.visits?.total > 0 && (
            <p className="flex items-center gap-2 text-xs text-white/70">
              <Flame size={13} aria-hidden="true" />
              {m.visits.total} visit{m.visits.total === 1 ? '' : 's'} on record · last{' '}
              {relativeDay(m.visits.lastVisit)}
            </p>
          )}
        </div>
      )}

      <OkButton onDismiss={onDismiss} />
    </div>
  );
}

/**
 * /scan — the front-desk check-in screen. No site chrome: this runs on a
 * phone or tablet at the door all day, so it's built to be glanced at
 * from arm's length, not browsed. Reads a member's QR two ways at once —
 * this device's own camera, or a USB/Bluetooth scanner gun, which the OS
 * reports as a keyboard "typing" the code — so it works with or without
 * extra hardware.
 */
export default function Scan() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wedgeInputRef = useRef(null);
  const rafRef = useRef(null);
  const lastCodeRef = useRef({ value: null, at: 0 });

  const [cameraError, setCameraError] = useState(null);
  // Stays on screen until staff presses OK — no auto-dismiss, so a busy
  // front desk never has a card vanish mid-read. A new scan replaces it.
  const [result, setResult] = useState(null); // { valid, checkedInAt, member } | { error }
  const verify = useVerifyMembershipQr();
  const verifyRef = useRef(verify);
  verifyRef.current = verify;

  const dismissResult = useCallback(() => setResult(null), []);

  const handleCode = useCallback((raw) => {
    const code = raw.trim();
    if (!code) return;
    const now = Date.now();
    if (lastCodeRef.current.value === code && now - lastCodeRef.current.at < RESCAN_COOLDOWN_MS) {
      return; // same card still in view / already processed
    }
    lastCodeRef.current = { value: code, at: now };

    verifyRef.current.mutate(code, {
      onSuccess: setResult,
      onError: () => setResult({ valid: false, error: true }),
    });
  }, []);

  // Keyboard-wedge input: a scanner gun "types" into whatever has focus,
  // then sends Enter. Keep this field focused at all times so a scan
  // lands here no matter what, and it doubles as a manual-entry fallback.
  useEffect(() => {
    const input = wedgeInputRef.current;
    const refocus = () => input?.focus();
    refocus();
    document.addEventListener('click', refocus);
    return () => document.removeEventListener('click', refocus);
  }, []);

  const onWedgeKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const value = e.currentTarget.value;
    e.currentTarget.value = '';
    // Bare Enter (keyboard or scanner gun) acknowledges the open result,
    // same as pressing OK — a new scanned code replaces it instead.
    if (!value.trim()) {
      dismissResult();
      return;
    }
    handleCode(value);
  };

  // Camera loop: sample video frames onto a hidden canvas and hand each
  // frame to jsQR. Pauses while a result is on screen.
  useEffect(() => {
    let stream;
    let cancelled = false;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(frame.data, frame.width, frame.height);
      if (code?.data) handleCode(code.data);
      rafRef.current = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => setCameraError('Camera unavailable — a scanner gun still works.'));

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [handleCode]);

  return (
    <div className="fixed inset-0 flex flex-col bg-stone-950 text-stone-100">
      {/* Invisible but focused — catches scanner-gun "typing" and doubles
          as a manual-entry fallback. Not display:none, so it stays
          focusable across browsers. */}
      <input
        ref={wedgeInputRef}
        onKeyDown={onWedgeKeyDown}
        className="absolute h-px w-px overflow-hidden opacity-0"
        style={{ clip: 'rect(0,0,0,0)' }}
        aria-label="Scanner input"
        autoComplete="off"
      />

      <header className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="font-display text-lg font-bold">
            PRIME<span className="italic text-gold-400">TIME</span>
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Front desk</p>
        </div>
        <Link
          to="/admin"
          className="flex h-10 w-10 items-center justify-center rounded-full text-stone-400 transition-colors hover:text-gold-300"
          aria-label="Exit scanner"
        >
          <LogOut size={18} aria-hidden="true" />
        </Link>
      </header>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 pb-10">
        <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-stone-800 bg-stone-900">
          {cameraError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <CameraOff size={32} className="text-stone-600" aria-hidden="true" />
              <p className="text-sm text-stone-500">{cameraError}</p>
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-gold-400/60" />
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`pointer-events-none absolute h-6 w-6 border-gold-300 ${
                    ['left-6 top-6 border-l-[3px] border-t-[3px]', 'right-6 top-6 border-r-[3px] border-t-[3px]',
                     'left-6 bottom-6 border-l-[3px] border-b-[3px]', 'right-6 bottom-6 border-r-[3px] border-b-[3px]'][i]
                  }`}
                />
              ))}
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                className={`absolute inset-0 text-white ${
                  result.valid ? 'bg-emerald-600' : 'bg-red-600'
                }`}
              >
                <ResultCard result={result} onDismiss={dismissResult} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: EASE }}
          className="mt-6 flex items-center gap-2 text-sm text-stone-500"
        >
          <ScanLine size={15} aria-hidden="true" />
          Point the camera at the member's card, or use the scanner gun
        </motion.p>
      </div>
    </div>
  );
}
