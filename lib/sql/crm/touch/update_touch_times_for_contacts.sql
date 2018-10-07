WITH lt AS (
  SELECT * FROM get_last_touch_for_contacts($1::uuid[])
),
nt AS (
  SELECT * FROM get_next_touch_for_contacts($1::uuid[])
)
UPDATE
  contacts
SET
  last_touch = tt.last_touch,
  next_touch = tt.next_touch
FROM (
  SELECT
    lt.id,
    lt.last_touch,
    nt.next_touch
  FROM
    lt
    JOIN nt
      ON lt.id = nt.id
) tt
WHERE
  tt.id = contacts.id
RETURNING
  contacts.id
