import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiError } from '../api/client';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/**
 * GoogleSignInButton — renders Google's own Identity Services button
 * (it lives in a cross-origin iframe, so only Google's theme/shape/size
 * options can style it, not our CSS) and wires its result straight into
 * our own session via loginWithGoogle. Silently renders nothing if no
 * client ID is configured, so a clone of this project without Google
 * set up just falls back to email + password.
 *
 * `oneTap`: also triggers Google's One Tap prompt (a small corner card
 * that signs a returning visitor in with zero clicks if their browser
 * already has an active Google session) — reserved for the page where
 * that's the most natural, e.g. Login, not both auth pages at once.
 */
export default function GoogleSignInButton({ onSuccess, onError, oneTap = false }) {
  const { loginWithGoogle } = useAuth();
  const containerRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID || initializedRef.current) return undefined;

    let cancelled = false;
    let interval;
    let giveUp;

    const handleCredential = async (response) => {
      try {
        const user = await loginWithGoogle(response.credential);
        onSuccess?.(user);
      } catch (err) {
        onError?.(getApiError(err));
      }
    };

    const init = () => {
      if (cancelled || !window.google?.accounts?.id || !containerRef.current) return;
      initializedRef.current = true;

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredential,
        auto_select: false,
      });

      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'center',
        width: containerRef.current.offsetWidth || 320,
      });

      if (oneTap) window.google.accounts.id.prompt();
    };

    // The GIS script tag loads async — poll briefly for it rather than
    // assuming it's already on window by the time this mounts.
    if (window.google?.accounts?.id) {
      init();
    } else {
      interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          init();
        }
      }, 100);
      giveUp = setTimeout(() => clearInterval(interval), 8000);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (giveUp) clearTimeout(giveUp);
    };
  }, [loginWithGoogle, onSuccess, onError, oneTap]);

  if (!CLIENT_ID) return null;

  return <div ref={containerRef} className="flex justify-center" />;
}
