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
UPDATE
  contacts
SET
  parent = $2
FROM
  sub_contacts
WHERE
  contacts.id = sub_contacts.id
  AND contacts.id != $2