CREATE OR REPLACE FUNCTION clear_reminder_notifications()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  STRICT
AS $$
  BEGIN
    UPDATE reminders SET "notification" = NULL WHERE id = NEW.id;
    RETURN NEW;
  END;
$$