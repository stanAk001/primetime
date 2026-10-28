// Who counts as an admin.
//
// Previously this was a bare `user.email === process.env.ADMIN_EMAIL` in two
// places, which meant a stray space in .env or a capital letter in the
// address silently locked the owner out of /admin with no error — the UI
// just bounced to the dashboard. Addresses are normalised on both sides now,
// and more than one can be listed.
//
// ADMIN_EMAILS takes a comma-separated list; ADMIN_EMAIL still works for a
// single address so existing .env files keep functioning.
const adminEmails = () =>
  `${process.env.ADMIN_EMAILS ?? ''},${process.env.ADMIN_EMAIL ?? ''}`
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const isAdminEmail = (email) =>
  Boolean(email) && adminEmails().includes(String(email).trim().toLowerCase());

module.exports = { isAdminEmail, adminEmails };
