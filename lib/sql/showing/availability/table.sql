CREATE EXTENSION btree_gist;

CREATE TYPE iso_day_of_week AS ENUM (
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
);

CREATE TABLE showings_availabilities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  showing uuid NOT NULL REFERENCES showings (id),

  -- 0 is Monday, 6 is Sunday
  weekday iso_day_of_week,
  -- a time range in the unit of minutes
  availability int4range DEFAULT int4range(7 * 60, 22 * 60),

  CONSTRAINT sr_no_overlap EXCLUDE USING gist (showing WITH =, availability WITH &&),
  CONSTRAINT sr_enforce_bounds CHECK (
    lower_inc(availability)
    AND NOT upper_inc(availability)
    AND availability <@ int4range(0, 24 * 60)
  )
);

CREATE INDEX showings_availabilities_showing_idx ON showings_availabilities (showing);
