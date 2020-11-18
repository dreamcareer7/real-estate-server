WITH due_items AS (
  SELECT
    id
  FROM
    triggers_due
  WHERE
    due_at < NOW()
)
SELECT
  id
FROM
  triggers
  JOIN due_items USING (id)
FOR UPDATE
SKIP LOCKED
