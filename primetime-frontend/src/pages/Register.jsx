import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiError } from '../api/client';
import GoogleSignInButton from '../components/GoogleSignInButton';

const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  phone: z
    .string()
    .trim()
    .max(20, 'Phone number is too long')
    .optional()
    .or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function Register() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await signUp({ ...values, phone: values.phone || undefined });
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(getApiError(err));
    }
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12 sm:px-6">
      <div className="card w-full p-8">
        <h1 className="font-display text-3xl font-bold">Join Primetime</h1>
        <p className="mt-2 text-sm text-stone-400">
          Free to join — book any facility in minutes.
        </p>

        {serverError && (
          <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {serverError}
          </p>
        )}

        <div className="mt-6">
          <GoogleSignInButton
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="field-label">
                First name <span className="text-gold-400" aria-hidden="true">*</span>
              </label>
              <input
                id="firstName"
                autoComplete="given-name"
                placeholder="Akeem"
                className="field-input"
                {...register('firstName')}
              />
              {errors.firstName && <p className="field-error">{errors.firstName.message}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="field-label">
                Last name <span className="text-gold-400" aria-hidden="true">*</span>
              </label>
              <input
                id="lastName"
                autoComplete="family-name"
                placeholder="Stanley"
                className="field-input"
                {...register('lastName')}
              />
              {errors.lastName && <p className="field-error">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="field-label">
              Email <span className="text-gold-400" aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
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
            <label htmlFor="phone" className="field-label">
              Phone <span className="text-xs font-normal text-stone-500">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+234 801 234 5678"
              className="field-input"
              {...register('phone')}
            />
            {errors.phone && <p className="field-error">{errors.phone.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="field-label">
              Password <span className="text-gold-400" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
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
            <p className="mt-1.5 text-xs text-stone-500">
              Minimum 8 characters.
            </p>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-gold w-full">
            {isSubmitting ? (
              <>
                <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-400">
          Already a member?{' '}
          <Link
            to="/login"
            state={location.state}
            className="font-medium text-gold-400 transition-colors hover:text-gold-300"
          >
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
