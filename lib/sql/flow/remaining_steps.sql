SELECT
  fs.id,
  fs.origin,
  now() AS "timestamp"
FROM
  flows_steps AS fs
WHERE
  fs.flow = $1::uuid
