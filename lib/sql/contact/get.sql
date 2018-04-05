WITH sub_contacts AS (
  SELECT
    c1_id AS id
  FROM
    joined_contacts
  JOIN
    unnest($1::uuid[])
    WITH ORDINALITY t(cid, ord)
    ON c2_id = cid
)
SELECT
  id,
  'sub_contact' AS type,
  EXTRACT(EPOCH FROM contacts.created_at) AS created_at,
  EXTRACT(EPOCH FROM contacts.updated_at) AS updated_at,
  EXTRACT(EPOCH FROM contacts.deleted_at) AS deleted_at,
  created_by,
  "user",
  brand,
  coalesce(parent, id) as parent,
  get_contact_users(id) as users,
  get_deals_with_contact($2::uuid, id) as deals
FROM
  contacts
  JOIN
    sub_contacts USING (id)
