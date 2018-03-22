CREATE OR REPLACE FUNCTION check_crm_activity_write_access(activity crm_activities, user_id uuid) RETURNS boolean AS
$$
  SELECT activity.created_by = user_id
$$
LANGUAGE SQL
IMMUTABLE;