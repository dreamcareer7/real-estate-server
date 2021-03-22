CREATE TABLE IF NOT EXISTS showings_approvals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),

  appointment uuid NOT NULL REFERENCES showings_appointments (id),
  role uuid NOT NULL REFERENCES showings_roles (id),

  -- TRUE means approved, FALSE means denied
  approved boolean NOT NULL,
  time timestamptz NOT NULL,
  comment text,

  UNIQUE (appointment, role, time)
)
