CREATE TABLE calendar_events_notification_settings (
  id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  "user" uuid REFERENCES users (id) NOT NULL,
  brand uuid REFERENCES brands (id) NOT NULL,

  object_type calendar_object_type NOT NULL,
  event_type text NOT NULL,

  deal uuid REFERENCES deals (id),
  contact uuid REFERENCES contacts (id),



  UNIQUE (deal, event_type),
  UNIQUE (contact, event_type)
)
