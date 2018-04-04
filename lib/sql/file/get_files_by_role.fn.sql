CREATE FUNCTION get_files_by_role(text, uuid) RETURNS uuid[] AS
$$
  SELECT
    array_agg(id)
  FROM
    role_files
  WHERE
    "role" = $1
    AND role_id = $2
$$
LANGUAGE SQL
STABLE;