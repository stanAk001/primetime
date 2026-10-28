import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { motion } from 'motion/react';
import { Check, CheckCircle2, Clock, Download, Loader2, XCircle } from 'lucide-react';
import { formatDate } from '../lib/format';
import { renderMembershipCardImage } from '../lib/cardImage';
import { EASE } from './motionKit';

// Days left before "active" starts reading as "expiring soon" instead —
// gives a member a heads-up to renew without alarming them too early.
const EXPIRY_WARNING_DAYS = 3;

const daysUntil = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
};

function CardStatus({ membership }) {
  if (!membership.is_valid_now) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-600 bg-stone-800/60 px-3 py-1 text-xs font-medium text-stone-400">
        <XCircle size={12} aria-hidden="true" />
        {membership.status === 'pending' ? 'Awaiting payment' : 'Expired'}
      </span>
    );
  }

  const left = daysUntil(membership.expires_at);
  if (left <= EXPIRY_WARNING_DAYS) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1 text-xs font-medium text-gold-300">
        <Clock size={12} aria-hidden="true" />
        {left <= 0 ? 'Expires today' : `${left} day${left > 1 ? 's' : ''} left`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
      <CheckCircle2 size={12} aria-hidden="true" />
      Active
    </span>
  );
}

/**
 * MembershipCard — the digital replacement for the physical QR access
 * card: a premium card in the site's gold/stone language, carrying a
 * live QR the front-desk scanner reads on entry.
 */
export default function MembershipCard({ membership, memberName }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Renders the card as a wallet-style PNG, then hands it to the phone's
  // native share sheet (Save to Photos, WhatsApp, …). Desktop browsers —
  // or a cancelled sheet — fall back to a plain download.
  const saveCard = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const blob = await renderMembershipCardImage({ membership, memberName });
      const file = new File([blob], 'primetime-membership-card.png', {
        type: 'image/png',
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Primetime membership card',
          text: 'My Primetime gym access card',
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'primetime-membership-card.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      // Closing the share sheet isn't an error.
      if (err?.name !== 'AbortError') console.error('Card save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(membership.qr_code, {
      margin: 1,
      width: 240,
      color: { dark: '#1c1917', light: '#f2c14e' },
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [membership.qr_code]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative overflow-hidden rounded-3xl border border-stone-700/70 bg-[linear-gradient(135deg,#1c1917,#0c0a09_60%)] p-6 shadow-2xl shadow-black/40"
    >
      {/* Faint brand ring, echoing the Logo mark */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-gold-400/15"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border border-gold-400/10"
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-400">
            {membership.facility_name ?? 'Gym'} membership
          </p>
          <h3 className="mt-2 font-display text-2xl font-bold text-white">{memberName}</h3>
          <p className="mt-1 text-sm text-stone-400">{membership.plan_name} plan</p>
        </div>
        <div className="shrink-0 rounded-2xl bg-white p-2">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Membership access QR code" className="h-24 w-24 sm:h-28 sm:w-28" />
          ) : (
            <div className="h-24 w-24 animate-pulse rounded bg-stone-200 sm:h-28 sm:w-28" />
          )}
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-700/60 pt-4">
        <div>
          <CardStatus membership={membership} />
          {membership.is_valid_now && (
            <p className="mt-2 text-xs text-stone-500">
              Valid until {formatDate(membership.expires_at)}
            </p>
          )}
        </div>
        <p className="font-mono text-[10px] tracking-wider text-stone-600">
          {membership.qr_code.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {membership.is_valid_now && (
        <div className="relative mt-5">
          <button
            type="button"
            onClick={saveCard}
            disabled={saving}
            className="btn-gold w-full"
          >
            {saving ? (
              <>
                <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                Preparing your card…
              </>
            ) : saved ? (
              <>
                <Check size={17} aria-hidden="true" />
                Saved!
              </>
            ) : (
              <>
                <Download size={17} aria-hidden="true" />
                Save card to phone
              </>
            )}
          </button>
          <p className="mt-2.5 text-center text-xs text-stone-500">
            Lands in your photos — scans at the door even with no internet.
          </p>
        </div>
      )}
    </motion.div>
  );
}
