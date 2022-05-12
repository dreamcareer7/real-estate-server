-- $1 contact_ids: uuid[]
-- $2 touch_freq: int

UPDATE contacts AS c SET
  touch_freq = least(c.touch_freq, $1::int)
WHERE
  c.id = ANY($1::uuid[]) AND
  c.deleted_at IS NULL
