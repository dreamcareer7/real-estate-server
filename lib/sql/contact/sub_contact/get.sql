WITH cusers AS (
  SELECT * FROM get_users_for_contacts($1::uuid[])
),
cdeals AS (
  SELECT * FROM get_deals_with_contacts($2::uuid, $1::uuid[])
)
SELECT
  id,
  'sub_contact' AS type,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  ios_address_book_id,
  android_address_book_id,
  created_by,
  "user",
  brand,
  coalesce(parent, id) as parent,
  (SELECT
    array_agg(contacts_attributes.id ORDER BY created_at)
  FROM
    contacts_attributes
  WHERE
    contacts_attributes.contact = contacts.id
    AND contacts_attributes.deleted_at IS NULL
  ) as attributes,
  (SELECT array_agg(user_id) FROM cusers WHERE contact_id = id) as users,
  (SELECT array_agg(deal) FROM cdeals WHERE contact = id) as deals
FROM
  contacts
  JOIN
    unnest($1::uuid[])
    WITH ORDINALITY t(cid, ord)
    ON contacts.id = cid
