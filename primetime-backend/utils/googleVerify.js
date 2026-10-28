const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const VALID_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

// google-auth-library verifies the token's signature locally, but to do that
// it must first fetch Google's public keys from www.googleapis.com. On
// networks where that host is blocked (some ISPs and corporate/AV filters do
// block it, while the rest of Google stays reachable) the fetch hangs for
// ~30s and every Google sign-in fails as "Invalid Google credential".
//
// So: try local verification first — it's the better path, needs no network
// once the keys are cached — and fall back to Google's tokeninfo endpoint on
// a different host. Google validates the signature there; we still re-check
// audience, issuer and expiry ourselves, because a token that is genuinely
// signed by Google but issued for a *different* application must not be
// accepted here.
const verifyViaTokenInfo = async (credential) => {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error('Google rejected the credential');

  const payload = await res.json();

  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Credential was issued for a different application');
  }
  if (!VALID_ISSUERS.includes(payload.iss)) {
    throw new Error('Unexpected token issuer');
  }
  if (Number(payload.exp) * 1000 <= Date.now()) {
    throw new Error('Credential has expired');
  }

  // tokeninfo returns these as the strings "true"/"false".
  return {
    ...payload,
    email_verified:
      payload.email_verified === true || payload.email_verified === 'true',
  };
};

// Fetching the signing keys should take well under a second. If it doesn't,
// the host is being blackholed rather than refused — waiting out the default
// ~30s socket timeout would make every sign-in look broken.
const LOCAL_VERIFY_TIMEOUT_MS = 4000;

// Once the key fetch has proved unreachable there is no point paying the
// timeout on every subsequent login, so remember it and go straight to the
// fallback. Re-checked periodically in case the network recovers.
let localVerifyBrokenUntil = 0;
const LOCAL_RETRY_AFTER_MS = 10 * 60 * 1000;

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('key fetch timed out')), ms)
    ),
  ]);

/**
 * Returns the verified payload of a Google ID token, or throws.
 * Never returns an unverified payload.
 */
const verifyGoogleCredential = async (credential) => {
  if (Date.now() < localVerifyBrokenUntil) {
    return verifyViaTokenInfo(credential);
  }

  try {
    const ticket = await withTimeout(
      googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      }),
      LOCAL_VERIFY_TIMEOUT_MS
    );
    return ticket.getPayload();
  } catch (localError) {
    // A network failure means "try the other host". A malformed or forged
    // token fails here too, but tokeninfo will reject it just as firmly, so
    // falling through is safe either way.
    const networkish =
      /timed out|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket|network|certs/i.test(
        localError.message
      );
    if (networkish) {
      localVerifyBrokenUntil = Date.now() + LOCAL_RETRY_AFTER_MS;
      console.warn(
        `⚠️  Google key fetch unreachable (${localError.message}) — using tokeninfo for the next 10 minutes`
      );
    }
    return verifyViaTokenInfo(credential);
  }
};

module.exports = { verifyGoogleCredential };
