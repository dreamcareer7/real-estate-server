-- $1 id

UPDATE triggers
SET
  origin = null
WHERE
  id = $1::uuid
