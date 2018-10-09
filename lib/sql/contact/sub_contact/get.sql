WITH cdeals AS (
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
  (SELECT
    array_agg(contacts_attributes.id ORDER BY created_at)
  FROM
    contacts_attributes
  WHERE
    contacts_attributes.contact = contacts.id
    AND contacts_attributes.deleted_at IS NULL
  ) as attributes,
  (
    SELECT
      array_agg("user")
    FROM
      contacts_users
    WHERE
      contact = id
      AND $3::text[] @> ARRAY['sub_contact.users']
  ) as users,
  (
    SELECT
      array_agg(deal)
    FROM
      cdeals
    WHERE
      contact = id
      AND $3::text[] @> ARRAY['sub_contact.deals']
  ) as deals
FROM
  contacts
  JOIN
    unnest($1::uuid[])
    WITH ORDINALITY t(cid, ord)
    ON contacts.id = cid
