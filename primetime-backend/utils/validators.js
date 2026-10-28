const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  phone: z.string().trim().max(20).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Missing Google credential'),
});

const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().max(20).optional(),
    profileImageUrl: z.string().url().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const facilitySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be kebab-case')
    .max(255),
  category: z.string().trim().min(1, 'Category is required').max(100),
  description: z.string().trim().optional(),
  longDescription: z.string().trim().optional(),
  capacity: z.number().int().positive().optional(),
  pricePerSession: z.number().nonnegative().optional(),
  currency: z.string().length(3).default('NGN'),
  amenities: z.array(z.string()).default([]),
  openingTime: z.string().regex(timePattern, 'Use HH:MM or HH:MM:SS').optional(),
  closingTime: z.string().regex(timePattern, 'Use HH:MM or HH:MM:SS').optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().optional(),
});

const updateFacilitySchema = facilitySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' }
);

const toTime = (t) => (t.length === 5 ? `${t}:00` : t);

// A booking is either a time slot (a pitch) or a room stay (check-in to
// check-out). The two carry different fields, so the schema accepts both and
// only insists that whichever shape was sent is internally consistent — the
// facility's booking_mode is what actually decides which one is allowed.
const createBookingSchema = z
  .object({
    facilityId: z.string().uuid('Valid facility id is required'),
    bookingDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    startTime: z.string().regex(timePattern, 'Use HH:MM or HH:MM:SS').optional(),
    endTime: z.string().regex(timePattern, 'Use HH:MM or HH:MM:SS').optional(),
    numberOfGuests: z.number().int().min(1, 'At least one guest is required'),
    notes: z.string().max(2000).optional(),
    roomId: z.string().uuid('Valid room id is required').optional(),
    checkOutDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .optional(),
  })
  .refine((data) => Boolean(data.roomId) || (data.startTime && data.endTime), {
    message: 'Either a room or a start and end time is required',
    path: ['startTime'],
  })
  .refine(
    (data) =>
      !data.startTime ||
      !data.endTime ||
      toTime(data.endTime) > toTime(data.startTime),
    { message: 'endTime must be after startTime', path: ['endTime'] }
  )
  .refine((data) => !data.checkOutDate || data.checkOutDate > data.bookingDate, {
    message: 'Check-out must be after check-in',
    path: ['checkOutDate'],
  });

const cancelBookingSchema = z.object({
  reason: z.string().trim().max(255).optional(),
});

const initializePaymentSchema = z.object({
  bookingId: z.string().uuid('Valid booking id is required'),
});

const membershipPlanSchema = z.object({
  facilityId: z.string().uuid('Valid facility id is required'),
  name: z.string().trim().min(1, 'Name is required').max(100),
  durationDays: z.number().int().positive('Duration must be at least 1 day'),
  price: z.number().nonnegative('Price cannot be negative'),
  currency: z.string().length(3).default('NGN'),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().optional(),
});

const updateMembershipPlanSchema = membershipPlanSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' }
);

const initializeMembershipSchema = z.object({
  planId: z.string().uuid('Valid plan id is required'),
});

const gymRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(200),
  phone: z.string().trim().min(7, 'Phone number is required').max(20),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
  weightKg: z
    .number({ message: 'Current weight is required' })
    .positive('Weight must be positive')
    .max(400, 'Enter weight in kilograms'),
  heightCm: z.number().positive().max(300, 'Enter height in centimetres').optional(),
  targetWeightKg: z.number().positive().max(400).optional(),
  goals: z
    .array(z.string().trim().min(1).max(40))
    .min(1, 'Pick at least one goal')
    .max(8),
  healthNotes: z.string().trim().max(1000).optional(),
  emergencyContactName: z.string().trim().max(100).optional(),
  emergencyContactPhone: z.string().trim().max(20).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  updateProfileSchema,
  facilitySchema,
  updateFacilitySchema,
  createBookingSchema,
  cancelBookingSchema,
  initializePaymentSchema,
  membershipPlanSchema,
  updateMembershipPlanSchema,
  initializeMembershipSchema,
  gymRegistrationSchema,
};
