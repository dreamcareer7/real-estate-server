CREATE TYPE showinghub_appointment_type AS ENUM (
  'FirstShowing',
  'SecondShowing',
  'ThirdShowing',
  'AgentPreview',
  'Appraisal',
  'BrokerPriceOpinion',
  'Inspection',
  'Maintenance'
);
CREATE TYPE showinghub_appointment_method AS ENUM (
  'InPersonOnly',
  'VirtualOnly',
  'InPersonAndVirtual'
);
CREATE TYPE showinghub_appointment_status AS ENUM (
  'Confirmed',
  'Cancelled',
  'Requested',
  'Denied'
);

CREATE TABLE showinghub.appointments (
  id uuid PRIMARY KEY,

  created_on timestamp,
  modified_on timestamp,

  actual_start_date timestamp NOT NULL,
  actual_end_date timestamp NOT NULL,
  appointment_type showinghub_appointment_type,
  appointment_method showinghub_appointment_method,

  buying_agent_id text,
  buying_agent_name text,
  buying_agent_license_state_affirmation boolean,
  buying_agent_license_number text,
  buying_agent_license_state text,
  buying_agent_mls_id text,

  appointment_status showinghub_appointment_status NOT NULL,
  appointment uuid REFERENCES showings_appointments (id)
)
