-- Add stripe_charge_id to bookings so we can store Stripe charge identifiers
ALTER TABLE bookings ADD COLUMN stripe_charge_id TEXT;
