SELECT
  t.id
FROM
  flows_steps AS fs
  JOIN triggers AS t
    ON t.flow_step = fs.id
  JOIN brands_flow_steps AS bfs
    ON fs.origin = bfs.id
WHERE
  fs.flow = $1::uuid
  AND fs.deleted_at IS NULL
  AND t.deleted_at IS NULL
ORDER BY
  bfs."order" DESC
LIMIT 2
