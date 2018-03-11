CREATE OR REPLACE FUNCTION check_task_read_access(task crm_tasks, user_id uuid) RETURNS boolean AS
$$
  SELECT task.created_by = user_id OR task.assignee = user_id
$$
LANGUAGE SQL
IMMUTABLE;