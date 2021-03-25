CREATE TYPE showing_approval_type AS ENUM (
  'None',
  'Any',
  'All'
);

CREATE TABLE showings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp,
  created_by uuid NOT NULL REFERENCES users (id),
  updated_by uuid NOT NULL REFERENCES users (id),
  deleted_by uuid REFERENCES users (id),

  brand uuid NOT NULL REFERENCES brands (id),

  aired_at timestamp,
  start_date date NOT NULL,
  end_date date,
  duration interval NOT NULL DEFAULT '15 minutes'::interval,
  notice_period interval NOT NULL DEFAULT '3 hours'::interval,
  approval_type showing_approval_type NOT NULL,

  feedback_template uuid REFERENCES templates_instances,

  deal uuid REFERENCES deals (id),
  listing uuid REFERENCES listings (id),

  address stdaddr,
  gallery uuid REFERENCES galleries (id),

  CONSTRAINT s_end_date CHECK ((end_date IS NULL) OR (start_date < end_date)),
  CONSTRAINT s_listing_exclusion CHECK ((deal IS NOT NULL) OR (listing IS NOT NULL) OR (address IS NOT NULL AND gallery IS NOT NULL))
);
