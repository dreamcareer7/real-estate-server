CREATE TYPE notification_delivery_type AS ENUM (
  'email',
  'push',
  'sms'
);

CREATE TYPE showing_role AS ENUM (
  'Admin/Assistant',
  'CoSellerAgent',
  'SellerAgent',
  'Tenant',
  'Other'
);

CREATE TABLE IF NOT EXISTS showings_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp,
  created_by uuid NOT NULL REFERENCES users (id),

  showing uuid NOT NULL REFERENCES showings (id),
  role showing_role NOT NULL,

  -- TODO: do we create a shadow user for owners/tenants?
  "user" uuid NOT NULL REFERENCES users (id),
  brand uuid NOT NULL REFERENCES brands (id),

  confirm_notification_type notification_delivery_type[] NOT NULL,
  cancel_notification_type notification_delivery_type[] NOT NULL,
  can_approve boolean NOT NULL,

  first_name text,
  last_name text,
  email text,
  phone_number text,

  CONSTRAINT sr_confirm_notification_type CHECK (
    can_approve IS FALSE OR
    array_length(confirm_notification_type, 1) > 0
  )
);

CREATE INDEX IF NOT EXISTS showings_roles_showing_idx ON showings_roles (showing);
