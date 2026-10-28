import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { dequeueOrder, enqueueOrder, flushQueue } from '../lib/offlineQueue';

// ---- Facilities ----

export const useFacilities = (category) =>
  useQuery({
    queryKey: ['facilities', category ?? 'all'],
    queryFn: async () => {
      const { data } = await api.get('/facilities', {
        params: category ? { category } : undefined,
      });
      return data.facilities;
    },
  });

export const useFacility = (slug) =>
  useQuery({
    queryKey: ['facility', slug],
    queryFn: async () => {
      const { data } = await api.get(`/facilities/${slug}`);
      return data.facility;
    },
    enabled: Boolean(slug),
  });

// ---- Bookings ----

// The venue's live state. Polled rather than pushed: a websocket for a
// figure that changes every few minutes would cost more than it's worth,
// and this endpoint is cached for 30s server-side anyway.
export const useVenuePulse = (options = {}) =>
  useQuery({
    queryKey: ['venue-pulse'],
    queryFn: async () => {
      const { data } = await api.get('/venue/pulse');
      return data.pulse;
    },
    refetchInterval: 60000,
    staleTime: 30000,
    ...options,
  });

// ——— Match nights ———

export const useMatchNights = (options = {}) =>
  useQuery({
    queryKey: ['match-nights'],
    queryFn: async () => {
      const { data } = await api.get('/match-nights');
      return data; // { fixtures, packages }
    },
    ...options,
  });

export const useReserveMatchNight = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/match-nights/reservations', payload);
      return data; // { reservation, fixture, message }
    },
    // The seats-taken figure on every card is now stale.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['match-nights'] }),
  });
};

export const useMatchReservations = (options = {}) =>
  useQuery({
    queryKey: ['match-reservations'],
    queryFn: async () => {
      const { data } = await api.get('/admin/match-reservations');
      return data.reservations;
    },
    refetchInterval: 30000,
    ...options,
  });

export const useUpdateMatchReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await api.put(`/admin/match-reservations/${id}`, { status });
      return data.reservation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['match-reservations'] }),
  });
};

// ——— Lounge menu, hotel rooms, waiter calls ———

export const useMenu = (facilitySlug, options = {}) =>
  useQuery({
    queryKey: ['menu', facilitySlug],
    queryFn: async () => {
      const { data } = await api.get(`/facilities/${facilitySlug}/menu`);
      return data.menu;
    },
    enabled: Boolean(facilitySlug),
    ...options,
  });

export const useRooms = (facilitySlug, options = {}) =>
  useQuery({
    queryKey: ['rooms', facilitySlug],
    queryFn: async () => {
      const { data } = await api.get(`/facilities/${facilitySlug}/rooms`);
      return data.rooms;
    },
    enabled: Boolean(facilitySlug),
    ...options,
  });

// The order is written to the local queue *before* the network is touched,
// and only removed once the server confirms it. If the request fails for a
// network reason the order survives in storage and the reconnect flush sends
// it — carrying the same clientRef, so it can never become a second round.
export const usePlaceOrder = () =>
  useMutation({
    mutationFn: async ({ facilitySlug = 'bar-lounge', tableLabel, note, items }) => {
      const payload = { facilitySlug, tableLabel, note, items };
      const clientRef = enqueueOrder(payload);

      try {
        const { data } = await api.post('/orders', { ...payload, clientRef });
        dequeueOrder(clientRef);
        return data; // { order, duplicate, message }
      } catch (err) {
        const status = err?.response?.status;
        // The server answered and refused it — that will never succeed on a
        // retry, so don't leave it sitting in the queue.
        if (status && status >= 400 && status < 500) {
          dequeueOrder(clientRef);
          throw err;
        }
        // No answer: it stays queued and the flush will deliver it.
        const offlineError = new Error('queued-offline');
        offlineError.queued = true;
        offlineError.clientRef = clientRef;
        throw offlineError;
      }
    },
  });

// Sends anything stranded in the queue. Called on reconnect and on load.
export const useFlushOrderQueue = () =>
  useMutation({
    mutationFn: async () =>
      flushQueue(async (item) => {
        const { data } = await api.post('/orders', {
          facilitySlug: item.facilitySlug,
          tableLabel: item.tableLabel,
          note: item.note,
          items: item.items,
          clientRef: item.clientRef,
        });
        return data;
      }),
  });

export const useOrders = (options = {}) =>
  useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await api.get('/admin/orders');
      return data; // { orders, openCount }
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    ...options,
  });

export const useUpdateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await api.put(`/admin/orders/${id}`, { status });
      return data.order;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
};

export const useCallWaiter = () =>
  useMutation({
    mutationFn: async ({ facilitySlug = 'bar-lounge', tableLabel, note }) => {
      const { data } = await api.post('/waiter-calls', {
        facilitySlug,
        tableLabel,
        note,
      });
      return data; // { call, duplicate, message }
    },
  });

// Staff-facing. Polls, because a table waiting on a drink shouldn't depend on
// someone remembering to refresh the page.
export const useWaiterCalls = (options = {}) =>
  useQuery({
    queryKey: ['waiter-calls'],
    queryFn: async () => {
      const { data } = await api.get('/admin/waiter-calls');
      return data; // { calls, pendingCount }
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    ...options,
  });

export const useUpdateWaiterCall = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data } = await api.put(`/admin/waiter-calls/${id}`, { status });
      return data.call;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['waiter-calls'] }),
  });
};

export const useMyBookings = () =>
  useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const { data } = await api.get('/bookings');
      return data.bookings;
    },
  });

export const useBooking = (id) =>
  useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const { data } = await api.get(`/bookings/${id}`);
      return data.booking;
    },
    enabled: Boolean(id),
  });

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/bookings', payload);
      return data.booking;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => {
      const { data } = await api.put(`/bookings/${id}/cancel`, { reason });
      return data.booking;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });
};

// ---- Payments ----

export const useInitializePayment = () =>
  useMutation({
    mutationFn: async (bookingId) => {
      const { data } = await api.post('/payments/initialize', { bookingId });
      return data; // { authorizationUrl, reference, ... }
    },
  });

export const useVerifyPayment = (reference) =>
  useQuery({
    queryKey: ['payment-verify', reference],
    queryFn: async () => {
      const { data } = await api.get(`/payments/verify/${reference}`);
      return data; // { status, payment, booking }
    },
    enabled: Boolean(reference),
    retry: 1,
    refetchOnWindowFocus: false,
  });

// ---- Gym memberships ----

export const useMembershipPlans = (facilitySlug) =>
  useQuery({
    queryKey: ['membership-plans', facilitySlug ?? 'all'],
    queryFn: async () => {
      const { data } = await api.get('/membership-plans', {
        params: facilitySlug ? { facilitySlug } : undefined,
      });
      return data.plans;
    },
    enabled: Boolean(facilitySlug),
  });

export const useMyMemberships = (options = {}) =>
  useQuery({
    queryKey: ['memberships'],
    queryFn: async () => {
      const { data } = await api.get('/memberships');
      return data.memberships;
    },
    ...options,
  });

// Does the signed-in user hold a currently-valid gym membership? Drives the
// benefit wording on table tennis (which is free for members). Shares the
// ['memberships'] cache entry, so several cards on one page cost one request.
export const useIsGymMember = ({ enabled = true } = {}) => {
  const { data } = useMyMemberships({ enabled });
  return Boolean(
    data?.some((m) => m.facility_slug === 'gym' && m.is_valid_now)
  );
};

export const useInitializeMembership = () =>
  useMutation({
    mutationFn: async (planId) => {
      const { data } = await api.post('/memberships', { planId });
      return data; // { membership, authorizationUrl, reference, ... }
    },
  });

// Enrollment state: the member's gym profile (or null) + whether the
// one-time registration fee has been paid.
export const useGymRegistration = (options = {}) =>
  useQuery({
    queryKey: ['gym-registration'],
    queryFn: async () => {
      const { data } = await api.get('/memberships/registration');
      return data; // { profile | null, registrationFee }
    },
    ...options,
  });

// Saves the enrollment form and returns a Paystack checkout for the fee.
export const useSubmitGymRegistration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/memberships/register', payload);
      return data; // { profile, authorizationUrl, reference, ... }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['gym-registration'] }),
  });
};

// ---- Admin ----

export const useRevenueAnalytics = () =>
  useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      const { data } = await api.get('/admin/analytics/revenue');
      return data.analytics; // { totalRevenue, successfulPayments, byFacility, byMonth }
    },
  });

export const useAdminBookings = (filters = {}) =>
  useQuery({
    queryKey: ['admin', 'bookings', filters],
    queryFn: async () => {
      const { data } = await api.get('/admin/bookings', { params: filters });
      return data.bookings;
    },
    placeholderData: (prev) => prev,
  });

export const useCreateFacility = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/admin/facilities', payload);
      return data.facility;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'facilities'] });
    },
  });
};

export const useUpdateFacility = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/admin/facilities/${id}`, payload);
      return data.facility;
    },
    onSuccess: (facility) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facility', facility.slug] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'facilities'] });
    },
  });
};

// Sees inactive rows too, unlike useFacilities() — for the admin manager.
export const useAdminFacilities = () =>
  useQuery({
    queryKey: ['admin', 'facilities'],
    queryFn: async () => {
      const { data } = await api.get('/admin/facilities');
      return data.facilities;
    },
  });

export const useAdminMembershipPlans = () =>
  useQuery({
    queryKey: ['admin', 'membership-plans'],
    queryFn: async () => {
      const { data } = await api.get('/admin/membership-plans');
      return data.plans;
    },
  });

export const useAdminMemberships = (filters = {}) =>
  useQuery({
    queryKey: ['admin', 'memberships', filters],
    queryFn: async () => {
      const { data } = await api.get('/admin/memberships', { params: filters });
      return data.memberships;
    },
    placeholderData: (prev) => prev,
  });

export const useCreateMembershipPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/admin/membership-plans', payload);
      return data.plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'membership-plans'] });
    },
  });
};

export const useUpdateMembershipPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/admin/membership-plans/${id}`, payload);
      return data.plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'membership-plans'] });
    },
  });
};

// Front-desk QR scan — a mutation (not a query) since it's fired on demand
// per scan, never cached or auto-refetched.
export const useVerifyMembershipQr = () =>
  useMutation({
    mutationFn: async (qrCode) => {
      const { data } = await api.get(
        `/admin/memberships/verify/${encodeURIComponent(qrCode)}`
      );
      return data; // { valid, member: { name, photo, plan, status, expiresAt } }
    },
  });
