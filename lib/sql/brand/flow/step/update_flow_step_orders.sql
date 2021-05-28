WITH should_update AS (
  SELECT
    id
  FROM
    brands_flow_steps bfs
  WHERE
    bfs.flow = $1::uuid
    AND bfs.order = $2::smallint
)
UPDATE
  brands_flow_steps
SET
  "order" = "order" + 1
FROM
  should_update
WHERE
  flow = $1::uuid
  AND "order" >= $2::smallint
