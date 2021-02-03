WITH due_items AS (
  SELECT
    id
  FROM
    triggers_due
  WHERE
    due_at < NOW()
    AND effective_at <= "timestamp"
)
SELECT
  id
FROM
  triggers
  JOIN due_items USING (id)
FOR UPDATE
SKIP LOCKED
