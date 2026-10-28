import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import {
  BellRing,
  Building2,
  CalendarDays,
  ChartColumn,
  Check,
  IdCard,
  Pencil,
  Plus,
  QrCode,
  Receipt,
  RotateCcw,
  Users,
  X,
} from 'lucide-react';
import { getApiError } from '../api/client';
import {
  useAdminBookings,
  useAdminFacilities,
  useAdminMemberships,
  useAdminMembershipPlans,
  useCreateFacility,
  useCreateMembershipPlan,
  useRevenueAnalytics,
  useUpdateFacility,
  useOrders,
  useUpdateMembershipPlan,
  useWaiterCalls,
} from '../api/hooks';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_META, categoryMeta } from '../lib/categories';
import { bookingWhen, formatDate, naira } from '../lib/format';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import OrdersPanel from '../components/OrdersPanel';
import WaiterCallsPanel from '../components/WaiterCallsPanel';
import { EASE, MaskText } from '../components/motionKit';

/* Chart color: validated against the dark surface with the dataviz
   six-checks script (lightness band, chroma, CVD, contrast) — the
   brand gold-400 is too light to be a mark fill on stone-950. */
const MARK = '#b8892f';
const MARK_HOVER = '#d9a441';

const compactNaira = (n) =>
  `₦${new Intl.NumberFormat('en-NG', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(n) || 0)}`;

// '2026-07' -> "Jul ’26"
const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const name = new Date(y, m - 1, 1).toLocaleDateString('en-NG', { month: 'short' });
  return `${name} ’${String(y).slice(2)}`;
};

// Clean tick step so the y-axis lands on round numbers.
const niceStep = (max) => {
  if (max <= 0) return 1;
  const rough = max / 3;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const unit = [1, 2, 2.5, 5, 10].find((c) => rough / pow <= c) ?? 10;
  return unit * pow;
};

/* ————— Overview ————— */

function StatTile({ label, value, sub, hero = false }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className={`mt-2 font-semibold text-stone-100 ${hero ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>
        {value}
      </p>
      {sub && <p className="mt-1.5 text-xs text-stone-500">{sub}</p>}
    </div>
  );
}

function MonthlyRevenueChart({ byMonth }) {
  const [hover, setHover] = useState(null);
  const months = byMonth.slice(-12).map((r) => ({
    month: r.month,
    revenue: Number(r.revenue),
    payments: Number(r.payments),
  }));
  const max = Math.max(...months.map((m) => m.revenue), 0);
  const step = niceStep(max);
  const top = step * 3;
  const ticks = [0, step, step * 2, step * 3];
  const maxIndex = months.reduce((mi, m, i) => (m.revenue > months[mi].revenue ? i : mi), 0);

  return (
    <div className="card p-5">
      <h3 className="text-sm font-medium text-stone-300">Revenue by month</h3>

      <div className="relative mt-6 h-56">
        {/* Recessive hairline grid + clean ticks */}
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute inset-x-0 flex items-center"
            style={{ bottom: `${(t / top) * 100}%` }}
            aria-hidden="true"
          >
            <span className="w-12 pr-2 text-right text-[10px] tabular-nums text-stone-500">
              {compactNaira(t)}
            </span>
            <span className="h-px flex-1 bg-stone-800" />
          </div>
        ))}

        {/* Columns */}
        <div className="absolute inset-y-0 left-12 right-0 flex items-end gap-1" aria-hidden="true">
          {months.map((m, i) => (
            <div
              key={m.month}
              className="relative flex h-full flex-1 items-end justify-center"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              tabIndex={0}
            >
              {/* Selective direct label: the peak month only */}
              {i === maxIndex && m.revenue > 0 && (
                <span
                  className="absolute left-1/2 -translate-x-1/2 text-[11px] font-medium text-stone-200"
                  style={{ bottom: `calc(${(m.revenue / top) * 100}% + 6px)` }}
                >
                  {compactNaira(m.revenue)}
                </span>
              )}
              <div
                className="w-full max-w-6 rounded-t transition-colors duration-150"
                style={{
                  height: `${(m.revenue / top) * 100}%`,
                  minHeight: m.revenue > 0 ? 3 : 0,
                  backgroundColor: hover === i ? MARK_HOVER : MARK,
                }}
              />
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs shadow-xl">
                  <p className="font-medium text-stone-200">{monthLabel(m.month)}</p>
                  <p className="mt-0.5 text-stone-400">
                    {naira(m.revenue)} · {m.payments} payment{m.payments === 1 ? '' : 's'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Month labels */}
      <div className="ml-12 mt-2 flex gap-1" aria-hidden="true">
        {months.map((m) => (
          <span key={m.month} className="flex-1 text-center text-[10px] uppercase text-stone-500">
            {monthLabel(m.month)}
          </span>
        ))}
      </div>

      {/* Table view for assistive tech */}
      <table className="sr-only">
        <caption>Revenue by month</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Revenue</th>
            <th>Payments</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <td>{monthLabel(m.month)}</td>
              <td>{naira(m.revenue)}</td>
              <td>{m.payments}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FacilityRevenueChart({ byFacility }) {
  const rows = byFacility.map((r) => ({
    ...r,
    revenue: Number(r.revenue),
    payments: Number(r.payments),
  }));
  const max = Math.max(...rows.map((r) => r.revenue), 1);

  return (
    <div className="card p-5">
      <h3 className="text-sm font-medium text-stone-300">Revenue by facility</h3>
      <div className="mt-5 space-y-3" aria-hidden="true">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 sm:grid-cols-[9rem_1fr_auto]">
            <span className="truncate text-sm text-stone-300">{r.name}</span>
            <div
              className="h-3.5 rounded-r bg-[#b8892f] transition-colors duration-150 hover:bg-[#d9a441]"
              style={{ width: `${(r.revenue / max) * 100}%`, minWidth: r.revenue > 0 ? 4 : 0 }}
              title={`${naira(r.revenue)} · ${r.payments} payment${r.payments === 1 ? '' : 's'}`}
            />
            <span className="text-xs tabular-nums text-stone-300">{compactNaira(r.revenue)}</span>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>Revenue by facility</caption>
        <thead>
          <tr>
            <th>Facility</th>
            <th>Revenue</th>
            <th>Payments</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{naira(r.revenue)}</td>
              <td>{r.payments}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverviewTab() {
  const { data: analytics, isLoading, isError, error, refetch } = useRevenueAnalytics();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading analytics…" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="text-stone-300">Couldn't load analytics.</p>
        <p className="mt-2 text-sm text-red-400/90">{getApiError(error)}</p>
        <button type="button" onClick={() => refetch()} className="btn-outline mt-4">
          <RotateCcw size={16} aria-hidden="true" /> Try again
        </button>
      </div>
    );
  }

  const totalRevenue = Number(analytics.totalRevenue);
  const payments = analytics.successfulPayments;
  const average = payments > 0 ? totalRevenue / payments : 0;
  const topFacility = analytics.byFacility[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile hero label="Total revenue" value={naira(totalRevenue)} sub="All successful payments" />
        <StatTile label="Payments" value={payments.toLocaleString('en-NG')} sub="Successful transactions" />
        <StatTile label="Average payment" value={naira(average)} sub="Revenue ÷ payments" />
        <StatTile
          label="Top facility"
          value={topFacility?.name ?? '—'}
          sub={topFacility ? `${compactNaira(topFacility.revenue)} to date` : 'No payments yet'}
        />
      </div>

      {payments === 0 ? (
        <div className="card p-10 text-center text-stone-400">
          No successful payments yet — charts will appear with the first confirmed booking.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <MonthlyRevenueChart byMonth={analytics.byMonth} />
          <FacilityRevenueChart byFacility={analytics.byFacility} />
        </div>
      )}
    </div>
  );
}

/* ————— Bookings ————— */

const BOOKING_STATUSES = ['', 'pending', 'confirmed', 'cancelled', 'completed'];

function BookingsTab() {
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const filters = useMemo(
    () => ({
      ...(status ? { status } : {}),
      ...(date ? { date } : {}),
    }),
    [status, date]
  );
  const { data: bookings, isLoading, isError, error, refetch } = useAdminBookings(filters);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {BOOKING_STATUSES.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatus(s)}
            aria-pressed={status === s}
            className={`min-h-9 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition-colors duration-200 ${
              status === s
                ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                : 'border-stone-700 text-stone-300 hover:border-stone-500'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Filter by date"
            className="field-input !min-h-9 !w-auto !py-1.5 text-sm"
          />
          {date && (
            <button
              type="button"
              onClick={() => setDate('')}
              className="text-xs text-stone-400 hover:text-gold-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner label="Loading bookings…" />
          </div>
        ) : isError ? (
          <div className="card mx-auto max-w-md p-8 text-center">
            <p className="text-stone-300">Couldn't load bookings.</p>
            <p className="mt-2 text-sm text-red-400/90">{getApiError(error)}</p>
            <button type="button" onClick={() => refetch()} className="btn-outline mt-4">
              <RotateCcw size={16} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : bookings?.length === 0 ? (
          <div className="card p-10 text-center text-stone-400">
            No bookings match these filters.
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-800 text-xs uppercase tracking-wider text-stone-500">
                  <th className="px-4 py-3 font-medium">Guest</th>
                  <th className="px-4 py-3 font-medium">Facility</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Guests</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/70">
                {bookings.map((b) => (
                  <tr key={b.id} className="transition-colors hover:bg-stone-800/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-200">
                        {b.first_name} {b.last_name}
                      </p>
                      <p className="text-xs text-stone-500">{b.user_email}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-300">{b.facility_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-stone-300">
                      {formatDate(String(b.booking_date).slice(0, 10))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-stone-300">
                      {bookingWhen(b)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-stone-300">{b.number_of_guests}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-stone-200">
                      {naira(b.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ————— Facilities manager ————— */

const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const facilityFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use kebab-case, e.g. bar-lounge')
    .max(255),
  category: z.string().min(1, 'Category is required'),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  longDescription: z.string().trim().optional().or(z.literal('')),
  capacity: z.coerce.number().int().positive('Capacity must be at least 1'),
  pricePerSession: z.coerce.number().nonnegative('Price cannot be negative'),
  openingTime: z.string().regex(timePattern, 'Use HH:MM').optional().or(z.literal('')),
  closingTime: z.string().regex(timePattern, 'Use HH:MM').optional().or(z.literal('')),
  amenities: z.string().optional().or(z.literal('')),
  isActive: z.boolean(),
  displayOrder: z.coerce.number().int().min(0),
});

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const facilityToForm = (f) => ({
  name: f.name,
  slug: f.slug,
  category: f.category,
  description: f.description ?? '',
  longDescription: f.long_description ?? '',
  capacity: f.capacity ?? 1,
  pricePerSession: Number(f.price_per_session ?? 0),
  openingTime: f.opening_time?.slice(0, 5) ?? '',
  closingTime: f.closing_time?.slice(0, 5) ?? '',
  amenities: Array.isArray(f.amenities) ? f.amenities.join(', ') : '',
  isActive: Boolean(f.is_active),
  displayOrder: f.display_order ?? 0,
});

function FacilityForm({ facility, defaultOrder = 0, onDone }) {
  const isEdit = Boolean(facility);
  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility();
  const mutation = isEdit ? updateFacility : createFacility;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, touchedFields, isSubmitting },
  } = useForm({
    resolver: zodResolver(facilityFormSchema),
    defaultValues: facility
      ? facilityToForm(facility)
      : {
          name: '',
          slug: '',
          category: 'fitness',
          description: '',
          longDescription: '',
          capacity: 10,
          pricePerSession: 0,
          openingTime: '',
          closingTime: '',
          amenities: '',
          isActive: true,
          displayOrder: defaultOrder,
        },
  });

  // Suggest a slug from the name until the admin edits the slug directly.
  const name = watch('name');
  useEffect(() => {
    if (!isEdit && !touchedFields.slug) setValue('slug', slugify(name || ''));
  }, [name, isEdit, touchedFields.slug, setValue]);

  const onSubmit = (values) => {
    const payload = {
      name: values.name,
      slug: values.slug,
      category: values.category,
      capacity: values.capacity,
      pricePerSession: values.pricePerSession,
      isActive: values.isActive,
      displayOrder: values.displayOrder,
      amenities: (values.amenities || '')
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      ...(values.description ? { description: values.description } : {}),
      ...(values.longDescription ? { longDescription: values.longDescription } : {}),
      ...(values.openingTime ? { openingTime: values.openingTime } : {}),
      ...(values.closingTime ? { closingTime: values.closingTime } : {}),
    };
    mutation.mutate(isEdit ? { id: facility.id, ...payload } : payload, {
      onSuccess: () => onDone?.(true),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div>
        <label className="field-label" htmlFor="f-name">Name</label>
        <input id="f-name" className="field-input" {...register('name')} />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>
      <div>
        <label className="field-label" htmlFor="f-slug">Slug</label>
        <input id="f-slug" className="field-input" {...register('slug')} />
        {errors.slug && <p className="field-error">{errors.slug.message}</p>}
      </div>
      <div>
        <label className="field-label" htmlFor="f-category">Category</label>
        <select id="f-category" className="field-input" {...register('category')}>
          {Object.entries(CATEGORY_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>
        {errors.category && <p className="field-error">{errors.category.message}</p>}
      </div>
      <div>
        <label className="field-label" htmlFor="f-price">Price per session (₦)</label>
        <input
          id="f-price"
          type="number"
          min="0"
          step="100"
          className="field-input"
          {...register('pricePerSession')}
        />
        {errors.pricePerSession && <p className="field-error">{errors.pricePerSession.message}</p>}
      </div>
      <div>
        <label className="field-label" htmlFor="f-capacity">Capacity</label>
        <input id="f-capacity" type="number" min="1" className="field-input" {...register('capacity')} />
        {errors.capacity && <p className="field-error">{errors.capacity.message}</p>}
      </div>
      <div>
        <label className="field-label" htmlFor="f-order">Display order</label>
        <input id="f-order" type="number" min="0" className="field-input" {...register('displayOrder')} />
        {errors.displayOrder && <p className="field-error">{errors.displayOrder.message}</p>}
      </div>
      <div>
        <label className="field-label" htmlFor="f-open">Opens</label>
        <input id="f-open" type="time" className="field-input" {...register('openingTime')} />
        {errors.openingTime && <p className="field-error">{errors.openingTime.message}</p>}
      </div>
      <div>
        <label className="field-label" htmlFor="f-close">Closes</label>
        <input id="f-close" type="time" className="field-input" {...register('closingTime')} />
        {errors.closingTime && <p className="field-error">{errors.closingTime.message}</p>}
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="f-desc">Short description</label>
        <input id="f-desc" className="field-input" {...register('description')} />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="f-long">Long description</label>
        <textarea id="f-long" rows={3} className="field-input" {...register('longDescription')} />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="f-amenities">Amenities (comma-separated)</label>
        <input
          id="f-amenities"
          className="field-input"
          placeholder="Free WiFi, Lockers, Showers"
          {...register('amenities')}
        />
      </div>
      <label className="flex items-center gap-2.5 text-sm text-stone-300 sm:col-span-2">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#d9a441]"
          {...register('isActive')}
        />
        Visible to customers
      </label>

      {mutation.isError && (
        <p className="text-sm text-red-400 sm:col-span-2">{getApiError(mutation.error)}</p>
      )}

      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-gold">
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create facility'}
        </button>
        <button type="button" onClick={() => onDone?.(false)} className="btn-outline">
          Cancel
        </button>
      </div>
    </form>
  );
}

function FacilitiesTab() {
  const { data: facilities, isLoading, isError, error, refetch } = useAdminFacilities();
  const [editingId, setEditingId] = useState(null); // facility id | 'new' | null
  const [savedMsg, setSavedMsg] = useState('');

  const done = (msg) => {
    setEditingId(null);
    if (msg) {
      setSavedMsg(msg);
      setTimeout(() => setSavedMsg(''), 4000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading facilities…" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="text-stone-300">Couldn't load facilities.</p>
        <p className="mt-2 text-sm text-red-400/90">{getApiError(error)}</p>
        <button type="button" onClick={() => refetch()} className="btn-outline mt-4">
          <RotateCcw size={16} aria-hidden="true" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-stone-400">
          {facilities.length} facilit{facilities.length === 1 ? 'y' : 'ies'} ·{' '}
          {facilities.filter((f) => f.is_active).length} live
        </p>
        <div className="flex items-center gap-3">
          {savedMsg && (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-300">
              <Check size={14} aria-hidden="true" /> {savedMsg}
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditingId(editingId === 'new' ? null : 'new')}
            className="btn-gold !min-h-9 !px-4 !py-1.5 text-sm"
          >
            {editingId === 'new' ? (
              <>
                <X size={15} aria-hidden="true" /> Close
              </>
            ) : (
              <>
                <Plus size={15} aria-hidden="true" /> New facility
              </>
            )}
          </button>
        </div>
      </div>

      {editingId === 'new' && (
        <div className="card p-6">
          <h3 className="mb-4 font-display text-lg font-semibold">New facility</h3>
          <FacilityForm
            defaultOrder={facilities.length + 1}
            onDone={(saved) => done(saved ? 'Facility created' : '')}
          />
        </div>
      )}

      {facilities.map((f) => {
        const meta = categoryMeta(f.category);
        const { Icon } = meta;
        const isEditing = editingId === f.id;
        return (
          <div key={f.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 bg-stone-900 ${meta.text}`}
                aria-hidden="true"
              >
                <Icon size={17} />
              </span>
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold text-stone-100">{f.name}</p>
                <p className="text-xs text-stone-500">
                  /{f.slug} · {meta.label}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-5 text-sm">
                <span className="tabular-nums text-stone-300">{naira(f.price_per_session)}</span>
                <span className="hidden text-stone-400 sm:inline">Up to {f.capacity}</span>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    f.is_active ? 'text-emerald-300' : 'text-stone-500'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                  {f.is_active ? 'Live' : 'Hidden'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingId(isEditing ? null : f.id)}
                  className="btn-outline !min-h-9 !px-4 !py-1.5 text-sm"
                >
                  {isEditing ? (
                    <>
                      <X size={14} aria-hidden="true" /> Close
                    </>
                  ) : (
                    <>
                      <Pencil size={14} aria-hidden="true" /> Edit
                    </>
                  )}
                </button>
              </div>
            </div>
            {isEditing && (
              <div className="mt-5 border-t border-stone-800 pt-5">
                <FacilityForm
                  facility={f}
                  onDone={(saved) => done(saved ? 'Facility updated' : '')}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ————— Membership plans ————— */

const planFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  durationDays: z.coerce.number().int().positive('Must be at least 1 day'),
  price: z.coerce.number().nonnegative('Price cannot be negative'),
  isActive: z.boolean(),
  displayOrder: z.coerce.number().int().min(0),
});

function MembershipPlanForm({ plan, facilityId, defaultOrder = 0, onDone }) {
  const isEdit = Boolean(plan);
  const createPlan = useCreateMembershipPlan();
  const updatePlan = useUpdateMembershipPlan();
  const mutation = isEdit ? updatePlan : createPlan;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(planFormSchema),
    defaultValues: plan
      ? {
          name: plan.name,
          durationDays: plan.duration_days,
          price: Number(plan.price),
          isActive: Boolean(plan.is_active),
          displayOrder: plan.display_order ?? 0,
        }
      : {
          name: '',
          durationDays: 1,
          price: 0,
          isActive: true,
          displayOrder: defaultOrder,
        },
  });

  const onSubmit = (values) => {
    const payload = { ...values, ...(isEdit ? {} : { facilityId }) };
    mutation.mutate(isEdit ? { id: plan.id, ...payload } : payload, {
      onSuccess: () => onDone?.(true),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div>
        <label className="field-label" htmlFor="p-name">Plan name</label>
        <input id="p-name" className="field-input" {...register('name')} />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>
      <div>
        <label className="field-label" htmlFor="p-days">Duration (days)</label>
        <input id="p-days" type="number" min="1" className="field-input" {...register('durationDays')} />
        {errors.durationDays && <p className="field-error">{errors.durationDays.message}</p>}
      </div>
      <div>
        <label className="field-label" htmlFor="p-price">Price (₦)</label>
        <input id="p-price" type="number" min="0" step="500" className="field-input" {...register('price')} />
        {errors.price && <p className="field-error">{errors.price.message}</p>}
      </div>
      <div>
        <label className="field-label" htmlFor="p-order">Display order</label>
        <input id="p-order" type="number" min="0" className="field-input" {...register('displayOrder')} />
        {errors.displayOrder && <p className="field-error">{errors.displayOrder.message}</p>}
      </div>
      <label className="flex items-center gap-2.5 text-sm text-stone-300 sm:col-span-2">
        <input type="checkbox" className="h-4 w-4 accent-[#d9a441]" {...register('isActive')} />
        Visible to members
      </label>

      {mutation.isError && (
        <p className="text-sm text-red-400 sm:col-span-2">{getApiError(mutation.error)}</p>
      )}

      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={isSubmitting || mutation.isPending} className="btn-gold">
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create plan'}
        </button>
        <button type="button" onClick={() => onDone?.(false)} className="btn-outline">
          Cancel
        </button>
      </div>
    </form>
  );
}

function MembershipPlansTab() {
  const { data: facilities } = useAdminFacilities();
  const { data: plans, isLoading, isError, error, refetch } = useAdminMembershipPlans();
  const [editingId, setEditingId] = useState(null);
  const [savedMsg, setSavedMsg] = useState('');
  const gymId = facilities?.find((f) => f.slug === 'gym')?.id;

  const done = (msg) => {
    setEditingId(null);
    if (msg) {
      setSavedMsg(msg);
      setTimeout(() => setSavedMsg(''), 4000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading plans…" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="text-stone-300">Couldn't load plans.</p>
        <p className="mt-2 text-sm text-red-400/90">{getApiError(error)}</p>
        <button type="button" onClick={() => refetch()} className="btn-outline mt-4">
          <RotateCcw size={16} aria-hidden="true" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="max-w-xl text-xs leading-relaxed text-stone-500">
        The ₦5,000 registration fee isn't set per plan — it's charged once,
        automatically, on whichever plan a member buys first, and never
        again after that. See it on a member's row in the Members tab.
      </p>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-stone-400">
          {plans.length} plan{plans.length === 1 ? '' : 's'} ·{' '}
          {plans.filter((p) => p.is_active).length} live
        </p>
        <div className="flex items-center gap-3">
          {savedMsg && (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-300">
              <Check size={14} aria-hidden="true" /> {savedMsg}
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditingId(editingId === 'new' ? null : 'new')}
            disabled={!gymId}
            className="btn-gold !min-h-9 !px-4 !py-1.5 text-sm"
          >
            {editingId === 'new' ? (
              <>
                <X size={15} aria-hidden="true" /> Close
              </>
            ) : (
              <>
                <Plus size={15} aria-hidden="true" /> New plan
              </>
            )}
          </button>
        </div>
      </div>

      {editingId === 'new' && gymId && (
        <div className="card p-6">
          <h3 className="mb-4 font-display text-lg font-semibold">New plan</h3>
          <MembershipPlanForm
            facilityId={gymId}
            defaultOrder={plans.length + 1}
            onDone={(saved) => done(saved ? 'Plan created' : '')}
          />
        </div>
      )}

      {plans.map((p) => {
        const isEditing = editingId === p.id;
        return (
          <div key={p.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold text-stone-100">{p.name}</p>
                <p className="text-xs text-stone-500">
                  {p.duration_days} day{p.duration_days > 1 ? 's' : ''}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-5 text-sm">
                <span className="tabular-nums text-stone-300">{naira(p.price)}</span>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    p.is_active ? 'text-emerald-300' : 'text-stone-500'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                  {p.is_active ? 'Live' : 'Hidden'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingId(isEditing ? null : p.id)}
                  className="btn-outline !min-h-9 !px-4 !py-1.5 text-sm"
                >
                  {isEditing ? (
                    <>
                      <X size={14} aria-hidden="true" /> Close
                    </>
                  ) : (
                    <>
                      <Pencil size={14} aria-hidden="true" /> Edit
                    </>
                  )}
                </button>
              </div>
            </div>
            {isEditing && (
              <div className="mt-5 border-t border-stone-800 pt-5">
                <MembershipPlanForm
                  plan={p}
                  onDone={(saved) => done(saved ? 'Plan updated' : '')}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ————— Members ————— */

const MEMBER_STATUSES = ['', 'pending', 'active', 'cancelled'];

function MembersTab() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const filters = useMemo(
    () => ({
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
    }),
    [status, search]
  );
  const { data: memberships, isLoading, isError, error, refetch } = useAdminMemberships(filters);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {MEMBER_STATUSES.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatus(s)}
            aria-pressed={status === s}
            className={`min-h-9 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition-colors duration-200 ${
              status === s
                ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                : 'border-stone-700 text-stone-300 hover:border-stone-500'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            aria-label="Search members"
            className="field-input !min-h-9 !w-56 !py-1.5 text-sm"
          />
          <Link to="/scan" className="btn-outline !min-h-9 !px-4 !py-1.5 text-sm">
            <QrCode size={14} aria-hidden="true" /> Open scanner
          </Link>
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner label="Loading members…" />
          </div>
        ) : isError ? (
          <div className="card mx-auto max-w-md p-8 text-center">
            <p className="text-stone-300">Couldn't load members.</p>
            <p className="mt-2 text-sm text-red-400/90">{getApiError(error)}</p>
            <button type="button" onClick={() => refetch()} className="btn-outline mt-4">
              <RotateCcw size={16} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : memberships?.length === 0 ? (
          <div className="card p-10 text-center text-stone-400">
            No members match these filters.
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-800 text-xs uppercase tracking-wider text-stone-500">
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Valid until</th>
                  <th className="px-4 py-3 font-medium">Paid</th>
                  <th className="px-4 py-3 font-medium">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/70">
                {memberships.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-stone-800/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-200">
                        {m.first_name} {m.last_name}
                      </p>
                      <p className="text-xs text-stone-500">{m.user_email}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-300">
                      {m.plan_name}
                      {m.registration_fee_paid && (
                        <span className="ml-1.5 text-xs text-gold-400/80">+ reg.</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-stone-300">
                      {m.expires_at ? formatDate(m.expires_at) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-stone-200">
                      {naira(m.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                          m.is_valid_now
                            ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                            : 'border-stone-600 bg-stone-800/60 text-stone-400'
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                        {m.is_valid_now ? 'Active' : m.status === 'pending' ? 'Unpaid' : 'Expired'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ————— Page ————— */

const TABS = [
  { id: 'overview', label: 'Overview', Icon: ChartColumn },
  { id: 'orders', label: 'Orders', Icon: Receipt },
  { id: 'service', label: 'Service calls', Icon: BellRing },
  { id: 'bookings', label: 'Bookings', Icon: CalendarDays },
  { id: 'facilities', label: 'Facilities', Icon: Building2 },
  { id: 'plans', label: 'Membership plans', Icon: IdCard },
  { id: 'members', label: 'Members', Icon: Users },
];

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  // Polled at the shell so the count shows on the tab from any other tab —
  // a table waiting on a drink shouldn't go unseen because someone is
  // reading the revenue chart.
  const { data: service } = useWaiterCalls();
  const { data: orderData } = useOrders();
  const badges = {
    service: service?.pendingCount ?? 0,
    orders: orderData?.openCount ?? 0,
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">
      <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-gold-400">
        <span className="h-px w-10 bg-gold-400/50" aria-hidden="true" />
        Back office
      </p>
      <h1 className="mt-3 font-display text-[1.75rem] font-bold text-balance sm:mt-4 sm:text-5xl">
        <MaskText lines={[<>The control room.</>]} />
      </h1>
      <p className="mt-3 text-sm text-stone-500">Signed in as {user?.email}</p>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-stone-800/70 pb-4" role="tablist">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              tab === id
                ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                : 'border-stone-700 text-stone-300 hover:border-stone-500'
            }`}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
            {badges[id] > 0 && (
              <motion.span
                key={badges[id]}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="rounded-full bg-gold-400 px-1.5 text-[11px] font-bold text-stone-950"
                aria-label={`${badges[id]} waiting`}
              >
                {badges[id]}
              </motion.span>
            )}
          </button>
        ))}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="mt-8"
      >
        {tab === 'overview' && <OverviewTab />}
        {tab === 'orders' && <OrdersPanel />}
        {tab === 'service' && <WaiterCallsPanel />}
        {tab === 'bookings' && <BookingsTab />}
        {tab === 'facilities' && <FacilitiesTab />}
        {tab === 'plans' && <MembershipPlansTab />}
        {tab === 'members' && <MembersTab />}
      </motion.div>
    </section>
  );
}
