CREATE TABLE calendar_notification_logs (
  id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  "timestamp" timestamptz not null,
  "user" uuid REFERENCES users (id),
  notification uuid REFERENCES notifications (id),

  PRIMARY KEY (id, "user", "timestamp")
)
