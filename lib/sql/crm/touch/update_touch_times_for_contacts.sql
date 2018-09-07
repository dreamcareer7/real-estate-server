WITH ult AS (
  UPDATE
    contacts
  SET
    last_touch = ltc.last_touch
  FROM
    (
      SELECT
        array_agg(contact) AS ids
      FROM
        crm_associations
      WHERE
        crm_task = $1::uuid
        AND deleted_at IS NULL
    ) AS cids,
    get_last_touch_for_contacts(cids.ids) as ltc
  WHERE
    contacts.id = ltc.contact
  RETURNING
    contacts.id
),
unt AS (
  UPDATE
    contacts
  SET
    next_touch = ntc.next_touch
  FROM
    (
      SELECT
        array_agg(id) AS ids
      FROM
        ult
    ) AS cids,
    get_next_touch_for_contacts(cids.ids) AS ntc
  WHERE
    ntc.contact = contacts.id
  RETURNING
    contacts.id
)
SELECT id FROM unt