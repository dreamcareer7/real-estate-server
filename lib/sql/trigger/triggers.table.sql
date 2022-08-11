CREATE TYPE trigger_action AS ENUM (
  'create_event',
  'schedule_email',
)

CREATE TABLE IF NOT EXISTS triggers (
  id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  executed_at timestamptz,

  created_within text NOT NULL,
  updated_within text NOT NULL,
  deleted_within text,
  executed_within text,

  created_by uuid NOT NULL REFERENCES users (id),
  "user" uuid NOT NULL REFERENCES users (id),
  brand uuid NOT NULL REFERENCES brands (id),

  event_type text NOT NULL,
  wait_for interval NOT NULL,
  "time" time,
  "action" trigger_action NOT NULL,
  recurring boolean NOT NULL,

  contact uuid REFERENCES contacts (id),
  deal uuid REFERENCES deals (id),

  flow uuid REFERENCES flows (id),
  flow_step uuid REFERENCES flows_steps (id),

  brand_event uuid REFERENCES brands_events (id),
  event uuid REFERENCES crm_tasks (id),
  campaign uuid REFERENCES email_campaigns (id),

  scheduled_after uuid REFERENCES triggers (id),

  CHECK ((flow IS NULL AND flow_step IS NULL) OR (flow IS NOT NULL AND flow_step IS NOT NULL)),
  CHECK (("action" = 'create_event' AND brand_event IS NOT NULL) OR ("action" = 'schedule_email' AND campaign IS NOT NULL)),
  CHECK (executed_at IS NULL OR "event" IS NOT NULL OR campaign IS NOT NULL),
  CHECK (executed_at IS NULL OR executed_within IS NOT NULL)
)
