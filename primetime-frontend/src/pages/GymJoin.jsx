import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  IdCard,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { useGymRegistration, useSubmitGymRegistration } from '../api/hooks';
import { getApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { GYM_GOALS, REGISTRATION_FEE, goalLabel } from '../lib/constants';
import { facilityImage } from '../lib/images';
import { naira } from '../lib/format';
import Spinner from '../components/Spinner';
import { EASE } from '../components/motionKit';

const STEPS = [
  { id: 'personal', title: 'About you', blurb: 'Who is walking through our doors?' },
  { id: 'body', title: 'Your body', blurb: 'So your coach starts with real numbers.' },
  { id: 'goals', title: 'Your goals', blurb: 'What are we building together?' },
  { id: 'review', title: 'Review & pay', blurb: 'One-time fee, lifetime membership file.' },
];

const slide = {
  enter: { opacity: 0, x: 56 },
  center: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.25, ease: EASE } },
};

const bmiOf = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  const bmi = weightKg / (m * m);
  const band =
    bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy range' : bmi < 30 ? 'Overweight' : 'Obese range';
  return { value: bmi.toFixed(1), band };
};

function Field({ id, label, optional, error, children, hint }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}{' '}
        {optional ? (
          <span className="text-xs font-normal text-stone-500">(optional)</span>
        ) : (
          <span className="text-gold-400" aria-hidden="true">*</span>
        )}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-stone-500">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export default function GymJoin() {
  const { user } = useAuth();
  const { data: registration, isLoading } = useGymRegistration();
  const submit = useSubmitGymRegistration();

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(() => ({
    fullName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
    phone: user?.phone ?? '',
    gender: '',
    weightKg: '',
    heightCm: '',
    targetWeightKg: '',
    goals: [],
    healthNotes: '',
  }));

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toggleGoal = (id) =>
    setForm((f) => ({
      ...f,
      goals: f.goals.includes(id) ? f.goals.filter((g) => g !== id) : [...f.goals, id],
    }));

  const bmi = useMemo(
    () => bmiOf(Number(form.weightKg), Number(form.heightCm)),
    [form.weightKg, form.heightCm]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Checking your registration…" />
      </div>
    );
  }

  // Already enrolled and paid — straight to plan selection.
  if (registration?.profile?.registration_fee_paid) {
    return <Navigate to="/facilities/gym" replace />;
  }

  const validateStep = () => {
    const next = {};
    if (step === 0) {
      if (form.fullName.trim().length < 2) next.fullName = 'Your full name is required';
      if (form.phone.trim().length < 7) next.phone = 'A phone number is required';
    }
    if (step === 1) {
      const w = Number(form.weightKg);
      if (!w || w <= 0 || w > 400) next.weightKg = 'Enter your weight in kilograms';
      const h = Number(form.heightCm);
      if (form.heightCm && (h <= 0 || h > 300)) next.heightCm = 'Enter height in centimetres';
      const t = Number(form.targetWeightKg);
      if (form.targetWeightKg && (t <= 0 || t > 400))
        next.targetWeightKg = 'Enter a target weight in kilograms';
    }
    if (step === 2 && form.goals.length === 0) {
      next.goals = 'Pick at least one goal — that is what your coach trains you for';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handlePay = () => {
    submit.mutate(
      {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        gender: form.gender || undefined,
        weightKg: Number(form.weightKg),
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        targetWeightKg: form.targetWeightKg ? Number(form.targetWeightKg) : undefined,
        goals: form.goals,
        healthNotes: form.healthNotes.trim() || undefined,
      },
      {
        onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl),
      }
    );
  };

  return (
    <section className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_360px] [&>*]:min-w-0">
      {/* ——— Form column ——— */}
      <div>
        <Link
          to="/facilities/gym"
          className="inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-gold-300"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Back to the gym
        </Link>

        <p className="mt-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
          <IdCard size={15} aria-hidden="true" />
          Member registration
        </p>
        <h1 className="mt-2 max-w-[16ch] font-display text-[1.75rem] font-bold text-balance sm:max-w-none sm:text-5xl">
          Become a <span className="italic text-gold-300">Primetime</span> member
        </h1>
        <p className="mt-3 max-w-lg text-stone-400">
          One form, one {naira(REGISTRATION_FEE)} registration — then every plan
          in the gym is open to you.
        </p>

        {/* Step rail */}
        <ol className="mt-8 flex items-center gap-2" aria-label="Registration steps">
          {STEPS.map((s, i) => (
            <li key={s.id} className="flex flex-1 flex-col gap-2">
              <div className="h-1 overflow-hidden rounded-full bg-stone-800">
                <motion.div
                  className="h-full rounded-full bg-gold-400"
                  initial={false}
                  animate={{ scaleX: i <= step ? 1 : 0 }}
                  style={{ originX: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                />
              </div>
              <span
                className={`hidden text-[11px] uppercase tracking-wider sm:block ${
                  i === step ? 'text-gold-300' : i < step ? 'text-stone-400' : 'text-stone-600'
                }`}
              >
                {i + 1}. {s.title}
              </span>
            </li>
          ))}
        </ol>

        <div className="card mt-6 overflow-hidden p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={step} variants={slide} initial="enter" animate="center" exit="exit">
              <h2 className="font-display text-2xl font-semibold">{STEPS[step].title}</h2>
              <p className="mt-1 text-sm text-stone-500">{STEPS[step].blurb}</p>

              {/* Step 1 — personal */}
              {step === 0 && (
                <div className="mt-6 space-y-4">
                  <Field id="fullName" label="Full name" error={errors.fullName}>
                    <input
                      id="fullName"
                      className="field-input"
                      autoComplete="name"
                      placeholder="Akeem Gbolahan"
                      value={form.fullName}
                      onChange={set('fullName')}
                    />
                  </Field>
                  <Field
                    id="phone"
                    label="Phone number"
                    error={errors.phone}
                    hint="Your coach reaches you here — WhatsApp preferred."
                  >
                    <input
                      id="phone"
                      type="tel"
                      className="field-input"
                      autoComplete="tel"
                      placeholder="+234 801 234 5678"
                      value={form.phone}
                      onChange={set('phone')}
                    />
                  </Field>
                  <Field id="gender" label="Gender" optional>
                    <div className="flex gap-2" role="group" aria-label="Gender">
                      {['male', 'female', 'other'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => set('gender')(form.gender === g ? '' : g)}
                          aria-pressed={form.gender === g}
                          className={`min-h-11 flex-1 cursor-pointer rounded-xl border px-3 py-2 text-sm capitalize transition-colors ${
                            form.gender === g
                              ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                              : 'border-stone-700 text-stone-300 hover:border-stone-500'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <p className="text-xs text-stone-500">
                    Registered to <span className="text-stone-300">{user?.email}</span>
                  </p>
                </div>
              )}

              {/* Step 2 — body metrics */}
              {step === 1 && (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="weightKg" label="Current weight (kg)" error={errors.weightKg}>
                      <input
                        id="weightKg"
                        type="number"
                        inputMode="decimal"
                        min="20"
                        max="400"
                        step="0.5"
                        className="field-input"
                        placeholder="82"
                        value={form.weightKg}
                        onChange={set('weightKg')}
                      />
                    </Field>
                    <Field id="heightCm" label="Height (cm)" optional error={errors.heightCm}>
                      <input
                        id="heightCm"
                        type="number"
                        inputMode="decimal"
                        min="80"
                        max="300"
                        step="0.5"
                        className="field-input"
                        placeholder="175"
                        value={form.heightCm}
                        onChange={set('heightCm')}
                      />
                    </Field>
                  </div>
                  <Field
                    id="targetWeightKg"
                    label="Target weight (kg)"
                    optional
                    error={errors.targetWeightKg}
                    hint="Where do you want the scale to land?"
                  >
                    <input
                      id="targetWeightKg"
                      type="number"
                      inputMode="decimal"
                      min="20"
                      max="400"
                      step="0.5"
                      className="field-input"
                      placeholder="75"
                      value={form.targetWeightKg}
                      onChange={set('targetWeightKg')}
                    />
                  </Field>

                  <AnimatePresence>
                    {bmi && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-between rounded-xl border border-stone-700 bg-stone-900 px-4 py-3"
                      >
                        <span className="text-sm text-stone-400">Your BMI</span>
                        <span className="text-sm">
                          <span className="font-display text-lg font-bold text-gold-300">
                            {bmi.value}
                          </span>{' '}
                          <span className="text-stone-400">· {bmi.band}</span>
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Field
                    id="healthNotes"
                    label="Anything we should know?"
                    optional
                    hint="Injuries, conditions, medications — kept private, seen by your coach only."
                  >
                    <textarea
                      id="healthNotes"
                      rows={3}
                      className="field-input resize-none"
                      placeholder="e.g. recovering from a knee injury"
                      value={form.healthNotes}
                      onChange={set('healthNotes')}
                    />
                  </Field>
                </div>
              )}

              {/* Step 3 — goals */}
              {step === 2 && (
                <div className="mt-6">
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3" role="group" aria-label="Training goals">
                    {GYM_GOALS.map(({ id, label, blurb, Icon }) => {
                      const selected = form.goals.includes(id);
                      return (
                        <motion.button
                          key={id}
                          type="button"
                          onClick={() => toggleGoal(id)}
                          aria-pressed={selected}
                          whileTap={{ scale: 0.97 }}
                          className={`relative flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition-colors duration-200 ${
                            selected
                              ? 'border-gold-400 bg-gold-400/10'
                              : 'border-stone-700 bg-stone-900/60 hover:border-stone-500'
                          }`}
                        >
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                              selected ? 'bg-gold-400 text-stone-950' : 'bg-stone-800 text-gold-300'
                            }`}
                          >
                            <Icon size={19} aria-hidden="true" />
                          </span>
                          <span>
                            <span className="block font-medium text-stone-100">{label}</span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">
                              {blurb}
                            </span>
                          </span>
                          <AnimatePresence>
                            {selected && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-gold-400 text-stone-950"
                              >
                                <Check size={12} strokeWidth={3} aria-hidden="true" />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      );
                    })}
                  </div>
                  {errors.goals && (
                    <p role="alert" className="field-error mt-3">
                      {errors.goals}
                    </p>
                  )}
                </div>
              )}

              {/* Step 4 — review & pay */}
              {step === 3 && (
                <div className="mt-6">
                  <dl className="space-y-2.5 text-sm">
                    {[
                      ['Name', form.fullName],
                      ['Phone', form.phone],
                      ['Email', user?.email],
                      form.gender && ['Gender', form.gender],
                      ['Weight', `${form.weightKg} kg`],
                      form.heightCm && ['Height', `${form.heightCm} cm`],
                      form.targetWeightKg && ['Target weight', `${form.targetWeightKg} kg`],
                      bmi && ['BMI', `${bmi.value} · ${bmi.band}`],
                    ]
                      .filter(Boolean)
                      .map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-4">
                          <dt className="text-stone-400">{label}</dt>
                          <dd className="text-right font-medium capitalize text-stone-200">{value}</dd>
                        </div>
                      ))}
                    <div className="flex items-start justify-between gap-4 border-t border-stone-800 pt-2.5">
                      <dt className="text-stone-400">Goals</dt>
                      <dd className="flex max-w-[60%] flex-wrap justify-end gap-1.5">
                        {form.goals.map((g) => (
                          <span
                            key={g}
                            className="rounded-full border border-gold-400/40 bg-gold-400/10 px-2.5 py-0.5 text-xs text-gold-200"
                          >
                            {goalLabel(g)}
                          </span>
                        ))}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex items-center justify-between rounded-2xl border border-gold-400/30 bg-gold-400/5 px-4 py-3.5">
                    <div>
                      <p className="font-medium text-stone-100">Registration fee</p>
                      <p className="text-xs text-stone-500">One-time — never charged again</p>
                    </div>
                    <p className="font-display text-2xl font-bold text-gold-300">
                      {naira(REGISTRATION_FEE)}
                    </p>
                  </div>

                  {submit.isError && (
                    <p
                      role="alert"
                      className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-300"
                    >
                      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                      {getApiError(submit.error)}
                    </p>
                  )}
                </div>
              )}

              {/* Nav buttons */}
              <div className="mt-8 flex items-center justify-between gap-3">
                {step > 0 ? (
                  <button type="button" onClick={goBack} className="btn-outline">
                    <ArrowLeft size={16} aria-hidden="true" /> Back
                  </button>
                ) : (
                  <span />
                )}
                {step < STEPS.length - 1 ? (
                  <button type="button" onClick={goNext} className="btn-gold">
                    Continue <ArrowRight size={16} aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={submit.isPending}
                    className="btn-gold"
                  >
                    {submit.isPending ? (
                      <>
                        <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                        Connecting to Paystack…
                      </>
                    ) : (
                      <>
                        <Lock size={16} aria-hidden="true" />
                        Pay {naira(REGISTRATION_FEE)} & register
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-stone-500">
          <ShieldCheck size={14} className="text-emerald-400" aria-hidden="true" />
          Paid securely with Paystack. Your details are private to Primetime staff.
        </p>
      </div>

      {/* ——— Side column: what you get ——— */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 overflow-hidden rounded-3xl border border-stone-800">
          <img
            src={facilityImage({ slug: 'gym', category: 'fitness' })}
            alt=""
            className="h-52 w-full object-cover"
          />
          <div className="bg-stone-900/60 p-6 backdrop-blur-sm">
            <h2 className="font-display text-xl font-semibold">What your {naira(REGISTRATION_FEE)} unlocks</h2>
            <ul className="mt-4 space-y-3">
              {[
                'Lifetime member file — registered once, remembered forever',
                'Digital access card with your own QR code',
                'A coach who knows your goals before your first session',
                'Access to every plan, from day pass to monthly',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-stone-300">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold-400" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-stone-800 pt-4 text-xs leading-relaxed text-stone-500">
              Step 2 happens after payment: pick the plan that fits your rhythm —
              daily, weekly or monthly.
            </p>
          </div>
        </div>
      </aside>
    </section>
  );
}
