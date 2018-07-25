WITH ult AS (
  UPDATE
    contacts
  SET
    last_touch = lt.last_touch
  FROM
    get_last_touch_for_contacts(
      SELECT
        array_agg(contact) AS ids
      FROM
        crm_associations
      WHERE
        touch = $1::uuid
        AND deleted_at IS NULL
    ) as ltc
  WHERE
    contacts.id = lt.contact
  RETURNING
    contacts.id
),
unt AS (
  UPDATE
    contacts
  SET
    next_touch = nt.next_touch
  FROM
    get_next_touch_for_contacts(
      SELECT
        array_agg(id) AS ids
      FROM
        ult
    ) AS ntc
  WHERE
    nt.contact = contacts.id
  RETURNING
    contacts.id
)
SELECT id FROM unt