import QRCode from 'qrcode';
import { formatDate } from './format';

// Wallet-pass proportions at 2x for crisp photos-app rendering.
const W = 1080;
const H = 1700;
const GOLD = '#f2c14e';

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// Shrink until the text fits — long Yoruba double-barrelled names included.
const fitFont = (ctx, text, { size, weight, family, maxWidth, minSize = 40 }) => {
  let s = size;
  for (;;) {
    ctx.font = `${weight} ${s}px "${family}"`;
    if (ctx.measureText(text).width <= maxWidth || s <= minSize) return s;
    s -= 4;
  }
};

const tracked = (ctx, spacing, draw) => {
  try {
    ctx.letterSpacing = spacing; // ignored by engines that don't support it
  } catch {
    /* older engines */
  }
  draw();
  try {
    ctx.letterSpacing = '0px';
  } catch {
    /* older engines */
  }
};

/**
 * Draws the member's digital access card as a 1080×1700 PNG — the same
 * dark-stone + gold identity as the on-screen card, with a QR sized to
 * scan straight off a phone screen or a print-out. Returns a Blob.
 */
export async function renderMembershipCardImage({ membership, memberName }) {
  // Make sure the brand fonts are actually in the canvas, not a fallback.
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load('700 92px "Playfair Display"'),
    document.fonts.load('italic 700 78px "Playfair Display"'),
    document.fonts.load('600 32px "Inter"'),
    document.fonts.load('400 40px "Inter"'),
  ]).catch(() => {});

  const qrDataUrl = await QRCode.toDataURL(membership.qr_code, {
    margin: 1,
    width: 640,
    errorCorrectionLevel: 'H',
    color: { dark: '#0c0a09', light: '#ffffff' },
  });
  const qrImg = await loadImage(qrDataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ——— Background ———
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1c1917');
  bg.addColorStop(0.65, '#0c0a09');
  bg.addColorStop(1, '#0c0a09');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Gold glow, bottom-left — echo of the site hero
  const glow = ctx.createRadialGradient(0, H, 0, 0, H, 900);
  glow.addColorStop(0, 'rgba(242,193,78,0.14)');
  glow.addColorStop(1, 'rgba(242,193,78,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Brand rings, top-right
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(242,193,78,0.16)';
  ctx.beginPath();
  ctx.arc(W - 30, 40, 290, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(242,193,78,0.09)';
  ctx.beginPath();
  ctx.arc(W - 30, 40, 380, 0, Math.PI * 2);
  ctx.stroke();

  // Hairline card border
  ctx.strokeStyle = 'rgba(120,113,108,0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(6, 6, W - 12, H - 12, 56);
  ctx.stroke();

  // ——— Wordmark ———
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 78px "Playfair Display", Georgia, serif';
  ctx.fillText('PRIME', 84, 176);
  const primeWidth = ctx.measureText('PRIME').width;
  ctx.fillStyle = GOLD;
  ctx.font = 'italic 700 78px "Playfair Display", Georgia, serif';
  ctx.fillText('TIME', 84 + primeWidth + 6, 176);

  ctx.fillStyle = '#78716c';
  ctx.font = '600 26px "Inter", sans-serif';
  tracked(ctx, '7px', () => ctx.fillText('IBADAN · NIGERIA', 86, 226));

  // ——— Member identity ———
  ctx.fillStyle = GOLD;
  ctx.font = '600 30px "Inter", sans-serif';
  tracked(ctx, '9px', () =>
    ctx.fillText(
      `${(membership.facility_name ?? 'GYM').toUpperCase()} MEMBERSHIP`,
      86,
      356
    )
  );

  const name = memberName?.trim() || 'Primetime Member';
  const nameSize = fitFont(ctx, name, {
    size: 92,
    weight: '700',
    family: 'Playfair Display',
    maxWidth: W - 172,
  });
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${nameSize}px "Playfair Display", Georgia, serif`;
  ctx.fillText(name, 84, 460);

  ctx.fillStyle = '#d6d3d1';
  ctx.font = '400 40px "Inter", sans-serif';
  ctx.fillText(`${membership.plan_name} plan`, 86, 526);

  // ——— QR panel ———
  const panel = 760;
  const panelX = (W - panel) / 2;
  const panelY = 590;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panel, panel, 48);
  ctx.fill();
  ctx.drawImage(qrImg, panelX + 60, panelY + 60, panel - 120, panel - 120);

  // Card reference under the panel
  ctx.textAlign = 'center';
  ctx.fillStyle = '#78716c';
  ctx.font = '600 34px "Inter", sans-serif';
  tracked(ctx, '12px', () =>
    ctx.fillText(membership.qr_code.slice(0, 8).toUpperCase(), W / 2, panelY + panel + 74)
  );

  // ——— Validity ———
  ctx.fillStyle = GOLD;
  ctx.font = '600 28px "Inter", sans-serif';
  tracked(ctx, '8px', () => ctx.fillText('VALID UNTIL', W / 2, 1512));

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 58px "Playfair Display", Georgia, serif';
  ctx.fillText(formatDate(membership.expires_at), W / 2, 1584);

  // ——— Footer ———
  ctx.fillStyle = '#a8a29e';
  ctx.font = '400 30px "Inter", sans-serif';
  ctx.fillText('Present this code at the front desk', W / 2, 1646);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not render card'))),
      'image/png'
    );
  });
}
