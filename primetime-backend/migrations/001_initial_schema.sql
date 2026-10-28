-- Primetime initial schema
-- Runs against primetime_db (PostgreSQL 13+, gen_random_uuid() is built in)

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  profile_image_url VARCHAR(500),
  membership_tier VARCHAR(50) DEFAULT 'free',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  long_description TEXT,
  capacity INT,
  price_per_session DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'NGN',
  amenities JSONB DEFAULT '[]',
  opening_time TIME,
  closing_time TIME,
  is_active BOOLEAN DEFAULT true,
  display_order INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_facilities_slug ON facilities(slug);
CREATE INDEX idx_facilities_category ON facilities(category);

CREATE TABLE facility_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  media_url VARCHAR(500) NOT NULL,
  media_type VARCHAR(50),
  alt_text VARCHAR(255),
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_facility_media_facility_id ON facility_media(facility_id);

CREATE TABLE facility_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  day_of_week INT,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT true,
  max_bookings_per_slot INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_availability_facility_id ON facility_availability(facility_id);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  number_of_guests INT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  cancelled_at TIMESTAMP,
  cancellation_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_facility_id ON bookings(facility_id);
CREATE INDEX idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  payment_method VARCHAR(50) DEFAULT 'paystack',
  paystack_reference VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  metadata JSONB,
  paid_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_paystack_reference ON payments(paystack_reference);
CREATE INDEX idx_payments_status ON payments(status);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  rating INT NOT NULL,
  title VARCHAR(255),
  comment TEXT,
  is_verified_booking BOOLEAN DEFAULT false,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reviews_facility_id ON reviews(facility_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);

-- Seed data
INSERT INTO facilities (name, slug, category, description, long_description, capacity, price_per_session, amenities, opening_time, closing_time, is_active, display_order)
VALUES
  ('Gym', 'gym', 'fitness', 'State-of-the-art fitness facility', 'Premium gym with free weights, cardio equipment, and personal training. Access to all modern exercise machines and facilities.', 100, 5000.00, '["Free WiFi", "Lockers", "Showers", "Personal Training", "Sauna"]'::jsonb, '06:00:00', '22:00:00', true, 1),
  ('Hotel', 'hotel', 'accommodation', 'Luxurious accommodation', 'Premium rooms with air conditioning, en-suite bathrooms, and 24-hour room service. Includes breakfast buffet and complimentary Wi-Fi.', 50, 15000.00, '["AC", "WiFi", "24hr Room Service", "Breakfast", "Gym Access"]'::jsonb, '00:00:00', '23:59:59', true, 2),
  ('Bar Lounge', 'bar-lounge', 'dining', 'Wine, grills and a live stage', 'Wine, spirits and fresh juice at the bar, grilled beef and cow leg pepper soup off the fire, and a stage where live acts perform through the night.', 150, 3000.00, '["Live Stage", "Grilled Beef & Cow Leg", "Wine & Spirits", "Fresh Juice", "Parking"]'::jsonb, '17:00:00', '02:00:00', true, 3),
  ('Football Ground', 'football-ground', 'sports', 'Professional football pitch', 'International standard 5-a-side and full-size pitches with floodlighting. Equipment hire available. Professional referee service optional.', 200, 10000.00, '["Floodlights", "Equipment Hire", "Changing Rooms", "Referee Service", "Parking"]'::jsonb, '06:00:00', '22:00:00', true, 4);

INSERT INTO facility_media (facility_id, media_url, media_type, alt_text, display_order)
SELECT id, 'https://via.placeholder.com/800x600?text=Gym+Image+1', 'image', 'Gym equipment', 1 FROM facilities WHERE slug = 'gym'
UNION ALL
SELECT id, 'https://via.placeholder.com/800x600?text=Gym+Image+2', 'image', 'Cardio area', 2 FROM facilities WHERE slug = 'gym'
UNION ALL
SELECT id, 'https://via.placeholder.com/800x600?text=Hotel+Room', 'image', 'Luxury room', 1 FROM facilities WHERE slug = 'hotel'
UNION ALL
SELECT id, 'https://via.placeholder.com/800x600?text=Bar+Lounge', 'image', 'Bar seating', 1 FROM facilities WHERE slug = 'bar-lounge';
