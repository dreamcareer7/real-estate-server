CREATE OR REPLACE FUNCTION check_task_read_access(task crm_tasks, user_id uuid, brand_id uuid) RETURNS boolean AS
$$
  SELECT task.brand = brand_id OR task.assignee = user_id
$$
LANGUAGE SQL
IMMUTABLE;