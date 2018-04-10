CREATE OR REPLACE FUNCTION clear_task_notifications()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  STRICT
AS $$
  BEGIN
    UPDATE crm_tasks SET "notification" = NULL WHERE id = NEW.id;
    UPDATE reminders SET "notification" = NULL WHERE task = NEW.id;
    RETURN NEW;
  END;
$$