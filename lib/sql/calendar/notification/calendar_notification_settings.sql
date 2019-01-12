CREATE TYPE calendar_object_type AS ENUM (
  'crm_task',
  'deal_context',
  'contact_attribute'
);

CREATE TABLE calendar_notification_settings (
  id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  "user" uuid REFERENCES users (id) NOT NULL,
  brand uuid REFERENCES brands (id) NOT NULL,

  object_type calendar_object_type NOT NULL,
  event_type text NOT NULL,

  reminder interval,

  UNIQUE (object_type, event_type)
);
