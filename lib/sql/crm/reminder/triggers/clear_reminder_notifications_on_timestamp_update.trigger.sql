CREATE TRIGGER clear_reminder_notifications_on_timestamp_update
AFTER UPDATE OF "timestamp" ON reminders
FOR EACH ROW
WHEN (NEW.timestamp > NOW())
EXECUTE PROCEDURE clear_reminder_notifications()