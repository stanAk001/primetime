import { useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useInitializeMembership, useMembershipPlans } from '../api/hooks';
import { getApiError } from '../api/client';
import { naira } from '../lib/format';
import Spinner from './Spinner';

/**
 * PlanPicker — the gym's plan step: pick a plan, pay, get a digital
 * card. Replaces the date/time BookingForm for the gym, which is
 * membership-based in reality, not booked by the session.
 *
 * Only rendered once the member has completed enrollment (profile +
 * one-time ₦5,000 registration fee), so every price here is the plan
 * price and nothing else.
 */
export default function PlanPicker({ facilitySlug }) {
  const { data: plans, isLoading, isError } = useMembershipPlans(facilitySlug);
  const initialize = useInitializeMembership();
  const [selectedId, setSelectedId] = useState(null);

  const handleJoin = (plan) => {
    setSelectedId(plan.id);
    initialize.mutate(plan.id, {
      onSuccess: ({ authorizationUrl }) => {
        window.location.assign(authorizationUrl);
      },
      onError: () => setSelectedId(null),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner label="Loading plans…" />
      </div>
    );
  }

  if (isError || !plans?.length) {
    return (
      <p className="text-center text-sm text-stone-400">
        Plans aren't available right now — please check back shortly.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {plans.map((plan) => {
        const isSelected = selectedId === plan.id;
        const isPending = initialize.isPending && isSelected;

        return (
          <motion.button
            key={plan.id}
            type="button"
            onClick={() => handleJoin(plan)}
            disabled={initialize.isPending}
            whileTap={{ scale: 0.99 }}
            className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-stone-700 bg-stone-900/60 p-4 text-left transition-colors duration-200 hover:border-gold-400/60 disabled:cursor-wait disabled:opacity-70"
          >
            <div>
              <p className="font-display text-lg font-semibold text-stone-100">{plan.name}</p>
              <p className="mt-0.5 text-xs text-stone-500">
                {plan.duration_days} day{plan.duration_days > 1 ? 's' : ''} of access
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-display text-xl font-bold text-gold-300">
                {naira(plan.price)}
              </span>
              {isPending ? (
                <Loader2 size={18} className="animate-spin text-gold-400" aria-hidden="true" />
              ) : (
                <span className="rounded-full border border-stone-600 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors group-hover:border-gold-400 group-hover:text-gold-300">
                  Select
                </span>
              )}
            </div>
          </motion.button>
        );
      })}

      {initialize.isError && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-300"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {getApiError(initialize.error)}
        </p>
      )}

      <p className="pt-1 text-center text-xs text-stone-500">
        You'll pay securely with Paystack — card, bank transfer or USSD.
      </p>
    </div>
  );
}
