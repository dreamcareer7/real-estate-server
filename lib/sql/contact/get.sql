SELECT
  c1.id,
  'sub_contact' AS type,
  EXTRACT(EPOCH FROM c1.created_at) AS created_at,
  EXTRACT(EPOCH FROM c1.updated_at) AS updated_at,
  EXTRACT(EPOCH FROM c1.deleted_at) AS deleted_at,
  c1.created_by,
  c1."user",
  c1.brand,
  coalesce(c1.parent, c1.id) as parent,
  get_contact_users(c1.id) as users,
  get_deals_with_contact($2::uuid, c1.id) as deals
FROM
  contacts c1,
  contacts c2
  JOIN
    unnest($1::uuid[])
    WITH ORDINALITY t(cid, ord)
    ON c2.id = cid
WHERE
  coalesce(c2.parent, c2.id) = coalesce(c1.parent, c1.id)
  AND c1.deleted_at IS NULL
  AND c2.deleted_at IS NULL
