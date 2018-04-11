CREATE TRIGGER clear_crm_task_notifications_on_due_update
AFTER UPDATE OF due_date ON crm_tasks
FOR EACH ROW
WHEN (NEW.due_date > NOW())
EXECUTE PROCEDURE clear_task_notifications()