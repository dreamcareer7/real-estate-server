CREATE OR REPLACE FUNCTION check_touch_read_access(touch touches, user_id uuid) RETURNS boolean AS
$$
  SELECT touch.created_by = user_id
$$
LANGUAGE SQL
IMMUTABLE;