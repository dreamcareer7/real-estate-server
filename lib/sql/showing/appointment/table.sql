CREATE TYPE showing_appointment_status AS ENUM (
  'Pending',
  'Accepted',
  'Rescheduled',
  'Cancelled',
  'Finished'
);

CREATE TABLE IF NOT EXISTS showings_appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),

  source text NOT NULL,

  time timestamptz NOT NULL,
  status showing_appointment_status NOT NULL DEFAULT 'Pending'::showing_appointment_status,

  showing uuid NOT NULL REFERENCES showings (id),
  contact uuid NOT NULL REFERENCES contacts (id),
  email text,
  phone_number text,
  first_name text,
  last_name text,
  company text
)
