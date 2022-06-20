-- $1 brand (uuid)
-- $2 input tags (text[])

UPDATE contacts AS c SET
  touch_freq = t.touch_freq
FROM
  unnest(lower($2::text)::text[]) AS it
  JOIN crm_tags AS t ON it = lower(t.tag)
WHERE
  t.brand = $1::uuid AND
  c.brand = $1::uuid AND
  t.deleted_at IS NULL AND
  t.touch_freq IS NOT NULL AND
  (c.touch_freq IS NULL OR c.touch_freq > t.touch_freq) AND
  it = ANY(lower(c.tag::text)::text[])
