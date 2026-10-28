import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiError } from '../api/client';
import GoogleSignInButton from '../components/GoogleSignInButton';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(getApiError(err));
    }
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12 sm:px-6">
      <div className="card w-full p-8">
        <h1 className="font-display text-3xl font-bold">Welcome back</h1>
        <p className="mt-2 text-sm text-stone-400">
          Sign in to manage your bookings.
        </p>

        {serverError && (
          <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {serverError}
          </p>
        )}

        <div className="mt-6">
          <GoogleSignInButton
            oneTap
            onSuccess={() => navigate(from, { replace: true })}
            onError={setServerError}
          />
        </div>

        <div className="my-6 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-stone-800" />
          <span className="text-xs uppercase tracking-wider text-stone-500">or</span>
          <span className="h-px flex-1 bg-stone-800" />
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="email" className="field-label">
              Email <span className="text-gold-400" aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              // Phone keyboards capitalise the first letter and "helpfully"
              // autocorrect addresses; both silently break sign-in.
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              placeholder="you@example.com"
              className="field-input"
              {...register('email')}
            />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="field-label">
              Password <span className="text-gold-400" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="field-input pr-12"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-stone-500 transition-colors hover:text-stone-300"
              >
                {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
            </div>
            {errors.password && <p className="field-error">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-gold w-full">
            {isSubmitting ? (
              <>
                <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-400">
          New to Primetime?{' '}
          <Link
            to="/register"
            state={location.state}
            className="font-medium text-gold-400 transition-colors hover:text-gold-300"
          >
            Create an account
          </Link>
        </p>
      </div>
    </section>
  );
}
