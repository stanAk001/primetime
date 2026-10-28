const nodemailer = require('nodemailer');

const isConfigured = () =>
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASSWORD &&
  !process.env.EMAIL_USER.startsWith('your_email') &&
  process.env.EMAIL_PASSWORD !== 'your_app_password';

let transporter;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  return transporter;
};

const naira = (amount) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(
    Number(amount)
  );

const formatDate = (d) =>
  (d instanceof Date ? d : new Date(d)).toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

// Web fonts don't load reliably in email — Georgia is the closest safe
// stand-in for the site's Playfair Display display type. Gold is the
// darker, text-contrast-safe step (validated separately for the admin
// charts) since the bright brand gold is too light against a white card.
const GOLD = '#b8892f';
const INK = '#1c1917';
const MUTED = '#78716c';

// Shared shell: dark wordmark header, white card body, plain footer.
// Table-based layout + inline styles throughout for Outlook/Gmail
// compatibility — no <style> blocks, no CSS that depends on a stylesheet
// actually being honored by the client.
const renderShell = ({ preheader, title, bodyHtml }) => `
<!doctype html>
<html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body style="margin:0; padding:0; background:#f2f0ec; font-family:Arial, Helvetica, sans-serif;">
    <span style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f0ec; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e7e2d8;">
            <tr>
              <td style="background:#0c0a09; padding:22px 28px;">
                <span style="font-family:Georgia, 'Times New Roman', serif; font-size:20px; font-weight:bold; color:#ffffff; letter-spacing:0.04em;">
                  PRIME<span style="color:${GOLD}; font-style:italic;">TIME</span>
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                <h1 style="margin:0 0 16px; font-family:Georgia, 'Times New Roman', serif; font-size:24px; color:${INK};">
                  ${title}
                </h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px; border-top:1px solid #e7e2d8;">
                <p style="margin:0; font-size:12px; line-height:1.6; color:${MUTED};">
                  Primetime Complex, Ibadan, Nigeria &middot; Questions? Just reply to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const row = (label, value) => `
  <tr>
    <td style="padding:9px 0; color:${MUTED}; font-size:14px; border-bottom:1px solid #f2f0ec;">${label}</td>
    <td style="padding:9px 0; color:${INK}; font-size:14px; font-weight:bold; text-align:right; border-bottom:1px solid #f2f0ec;">${value}</td>
  </tr>
`;

const ctaButton = (label, href) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr>
      <td style="border-radius:999px; background:${GOLD};">
        <a href="${href}" style="display:inline-block; padding:12px 26px; font-size:14px; font-weight:bold; color:#1c1917; text-decoration:none;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`;

// Fail-soft: email problems must never break the payment flow.
const sendBookingConfirmation = async ({ to, firstName, booking, facility }) => {
  if (!isConfigured()) {
    console.log(
      `📧 [email skipped — EMAIL_USER not configured] booking confirmation for ${to} (booking ${booking.id})`
    );
    return;
  }

  const html = renderShell({
    preheader: `Your ${facility.name} booking is confirmed for ${formatDate(booking.booking_date)}.`,
    title: 'Booking confirmed',
    bodyHtml: `
      <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:${INK};">
        Hi ${firstName || 'there'}, your spot at <strong>${facility.name}</strong> is locked in — see you there.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row('Date', formatDate(booking.booking_date))}
        ${row('Time', `${booking.start_time} &ndash; ${booking.end_time}`)}
        ${row('Guests', booking.number_of_guests)}
        ${row('Amount paid', naira(booking.total_amount))}
        ${row('Reference', booking.id)}
      </table>
      ${ctaButton('View my bookings', `${process.env.FRONTEND_URL}/dashboard`)}
    `,
  });

  try {
    await getTransporter().sendMail({
      from: `"Primetime" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Booking confirmed — ${facility.name}`,
      html,
    });
    console.log(`📧 Booking confirmation sent to ${to}`);
  } catch (err) {
    console.error(`📧 Failed to send confirmation email to ${to}:`, err.message);
  }
};

// Gym membership activation — no QR image embedded (inline images are
// stripped or blocked by default in most inboxes); points back to the
// dashboard where the live digital card actually lives instead.
const sendMembershipConfirmation = async ({ to, firstName, membership }) => {
  if (!isConfigured()) {
    console.log(
      `📧 [email skipped — EMAIL_USER not configured] membership confirmation for ${to} (membership ${membership.id})`
    );
    return;
  }

  const html = renderShell({
    preheader: `Your ${membership.plan_name} membership is active until ${formatDate(membership.expires_at)}.`,
    title: "You're a member!",
    bodyHtml: `
      <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:${INK};">
        Hi ${firstName || 'there'}, your <strong>${membership.plan_name}</strong> gym membership is
        active. Your digital access card — with the QR code the front desk scans you in
        with — is waiting in your dashboard.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${row('Plan', membership.plan_name)}
        ${row('Valid from', formatDate(membership.starts_at))}
        ${row('Valid until', formatDate(membership.expires_at))}
        ${row('Amount paid', naira(membership.total_amount))}
        ${
          membership.registration_fee_paid
            ? row('Includes', 'One-time registration &amp; access card')
            : ''
        }
      </table>
      ${ctaButton('View my digital card', `${process.env.FRONTEND_URL}/dashboard`)}
    `,
  });

  try {
    await getTransporter().sendMail({
      from: `"Primetime" <${process.env.EMAIL_USER}>`,
      to,
      subject: `You're a member — ${membership.plan_name} plan active`,
      html,
    });
    console.log(`📧 Membership confirmation sent to ${to}`);
  } catch (err) {
    console.error(`📧 Failed to send membership email to ${to}:`, err.message);
  }
};

module.exports = { sendBookingConfirmation, sendMembershipConfirmation };
