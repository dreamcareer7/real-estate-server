-- $1 id

UPDATE triggers
SET
  origin = null
WHERE
  id = $1::uuid
  OR scheduled_after = $1::uuid
