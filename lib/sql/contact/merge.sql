WITH sub_contacts AS (
  SELECT
    c1_id AS id
  FROM
    joined_contacts
  JOIN
    unnest($1::uuid[])
    WITH ORDINALITY t(cid, ord)
    ON c2_id = cid
), update_parent AS (
  UPDATE contacts SET updated_at = now() WHERE id = $2
)
UPDATE
  contacts
SET
  parent = $2,
  updated_at = now()
FROM
  sub_contacts
WHERE
  contacts.id = sub_contacts.id
  AND contacts.id != $2