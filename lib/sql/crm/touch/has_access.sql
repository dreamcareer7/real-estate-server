SELECT
  id,
  check_touch_read_access(touches, $2) AS "read",
  check_touch_write_access(touches, $2) AS "write"
FROM
  touches
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON touches.id = did
