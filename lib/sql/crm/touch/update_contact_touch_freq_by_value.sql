-- $1 contact_ids: uuid[]
-- $2 touch_freq: int

UPDATE contacts AS c SET
  touch_freq = $2::int
WHERE
  c.id = ANY($1::uuid[]) AND
  (c.touch_freq IS NULL OR c.touch_freq > $2::int)
