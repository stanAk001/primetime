import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight, Users } from 'lucide-react';
import { categoryMeta } from '../lib/categories';
import { facilityMedia } from '../lib/images';
import { naira } from '../lib/format';
import { facilityCta, facilityPricing } from '../lib/facilityCta';
import { useIsGymMember } from '../api/hooks';
import { useAuth } from '../context/AuthContext';
import BenefitBadge from './BenefitBadge';
import FacilityScene, { FacilityAccents } from './scenes/FacilityScene';
import MediaCarousel from './MediaCarousel';

const MotionLink = motion.create(Link);

export default function FacilityCard({ facility, featured = false }) {
  const meta = categoryMeta(facility.category);
  const { Icon } = meta;
  const { user } = useAuth();
  const isMember = useIsGymMember({ enabled: Boolean(user) });
  const cta = facilityCta(facility, { isMember });
  const isBenefit = cta.kind === 'benefit';
  const pricing = facilityPricing(facility);

  return (
    <MotionLink
      to={`/facilities/${facility.slug}`}
      aria-label={
        isBenefit
          ? `${facility.name} — ${cta.label}`
          : `${cta.label} — ${facility.name}`
      }
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="group relative block overflow-hidden rounded-3xl border border-stone-800/80 bg-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
    >
      {/* Video-first media carousel with the motion-design layer on top;
          the animated scene takes over if every clip and photo fails. */}
      {/* Shorter on phones: at half the screen width a 20rem-tall card is a
          narrow column of image with the type crushed into the bottom. */}
      <div
        className={`relative overflow-hidden ${
          featured ? 'h-56 sm:h-80 lg:h-[26rem]' : 'h-44 sm:h-72'
        }`}
      >
        <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:group-hover:scale-100">
          <MediaCarousel
            items={facilityMedia(facility)}
            interval={7000 + ((facility.display_order ?? 0) % 5) * 900}
            kenburns
            indicators="mini"
            fallback={<FacilityScene facility={facility} />}
          />
          <FacilityAccents facility={facility} />
        </div>
        {/* Layered cinematic overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/35 to-transparent"
          aria-hidden="true"
        />

        {/* Category chip */}
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-stone-950/60 px-3 py-1.5 text-xs font-medium tracking-wide text-stone-100 backdrop-blur-md">
          <Icon size={13} className={meta.text} aria-hidden="true" />
          {meta.label}
        </span>

        {/* Bottom content over image */}
        <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-5 lg:p-6">
          <div className="flex items-end justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <h3
                className={`font-display font-semibold text-white ${
                  featured
                    ? 'text-xl sm:text-3xl lg:text-4xl'
                    : 'text-base sm:text-2xl'
                }`}
              >
                {facility.name}
              </h3>
              {/* The one-line blurb is unreadable at half-width; it returns
                  as soon as there's room for it. */}
              <p className="mt-1.5 line-clamp-1 hidden max-w-md text-sm text-stone-300/90 sm:block">
                {facility.description}
              </p>
              {isBenefit ? (
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm sm:mt-3">
                  <BenefitBadge label={cta.label} />
                  <span className="hidden items-center gap-1 text-xs text-stone-400 sm:inline-flex">
                    <Users size={12} aria-hidden="true" /> up to {facility.capacity}
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-stone-300 sm:mt-3">
                  {pricing.kind === 'quote' ? (
                    <span className="font-display text-sm font-semibold italic text-gold-300 sm:text-lg">
                      {pricing.label}
                    </span>
                  ) : (
                    <>
                      {pricing.kind === 'from' && (
                        <span className="text-xs text-stone-400 sm:text-sm">from </span>
                      )}
                      <span className="font-display text-base font-bold text-gold-300 sm:text-xl">
                        {naira(pricing.amount ?? facility.price_per_session)}
                      </span>{' '}
                      <span className="text-xs text-stone-400 sm:text-sm">
                        {pricing.unit}
                      </span>
                    </>
                  )}
                  {/* Capacity is detail, not headline — it costs a line that
                      the price and the CTA need more on a narrow card. */}
                  <span className="ml-3 hidden items-center gap-1 text-xs text-stone-400 sm:inline-flex">
                    <Users size={12} aria-hidden="true" /> up to {facility.capacity}
                  </span>
                </p>
              )}
              <p
                className={`mt-2 text-xs font-semibold sm:mt-3 sm:text-sm ${
                  isBenefit ? 'text-stone-400' : 'text-gold-300'
                }`}
              >
                {isBenefit ? cta.note : cta.label}
              </p>
            </div>
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all duration-300 group-hover:border-gold-400 group-hover:bg-gold-400 group-hover:text-stone-950 sm:h-11 sm:w-11"
              aria-hidden="true"
            >
              <ArrowUpRight size={16} className="sm:hidden" />
              <ArrowUpRight size={18} className="hidden sm:block" />
            </span>
          </div>
        </div>
      </div>
    </MotionLink>
  );
}
