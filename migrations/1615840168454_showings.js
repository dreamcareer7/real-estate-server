const db = require('../lib/utils/db')

const migrations = [
  'CREATE EXTENSION IF NOT EXISTS btree_gist',
  'BEGIN',
  `CREATE TYPE iso_day_of_week AS ENUM (
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  )`,
  `CREATE TYPE showing_approval_type AS ENUM (
    'None',
    'Any',
    'All'
  )`,
  `CREATE TYPE notification_delivery_type AS ENUM (
    'email',
    'push',
    'sms'
  )`,
  `CREATE TYPE showing_appointment_status AS ENUM (
    'Pending',
    'Accepted',
    'Rescheduled',
    'Cancelled',
    'Finished'
  )`,
  'ALTER TABLE showings RENAME TO "showings.com"',
  `CREATE TABLE IF NOT EXISTS showings (
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
  )`,
  `CREATE TABLE IF NOT EXISTS showings_roles (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    deleted_at timestamp,
    created_by uuid NOT NULL REFERENCES users (id),
  
    showing uuid NOT NULL REFERENCES showings (id),
    role deal_role NOT NULL,
  
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
  )`,
  'CREATE INDEX IF NOT EXISTS showings_roles_showing_idx ON showings_roles (showing)',
  `CREATE TABLE IF NOT EXISTS showings_appointments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
  
    source text NOT NULL,
  
    time timestamptz NOT NULL,
    status showing_appointment_status NOT NULL DEFAULT 'Pending'::showing_appointment_status,
  
    showing uuid NOT NULL REFERENCES showings (id),
    contact uuid NOT NULL REFERENCES contacts (id)
  )
  `,
  `CREATE TABLE IF NOT EXISTS showings_approvals (
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
  `,
  `CREATE TABLE IF NOT EXISTS showings_availabilities (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    showing uuid NOT NULL REFERENCES showings (id),
  
    -- 0 is Monday, 6 is Sunday
    weekday iso_day_of_week,
    -- a time range in the unit of minutes
    availability int4range DEFAULT int4range(7 * 60, 22 * 60),
  
    CONSTRAINT sr_no_overlap EXCLUDE USING gist (showing WITH =, weekday WITH =, availability WITH &&),
    CONSTRAINT sr_enforce_bounds CHECK (
      lower_inc(availability)
      AND NOT upper_inc(availability)
      AND availability <@ int4range(0, 24 * 60)
    )
  )`,
  'CREATE INDEX IF NOT EXISTS showings_availabilities_showing_idx ON showings_availabilities (showing)',
  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
