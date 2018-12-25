WITH cids AS (
  SELECT
    array_agg(DISTINCT contact) AS ids
  FROM
    crm_associations
  WHERE
    deleted_at IS NULL
    AND association_type = 'contact'
    AND crm_task = $1::uuid
),
lt AS (
  SELECT
    c.id AS contact,
    ltc.last_touch
  FROM
    cids,
    unnest(cids.ids) AS c(id)
    LEFT JOIN get_last_touch_for_contacts(cids.ids) as ltc
      ON c.id = ltc.contact
),
ult AS (
  UPDATE
    contacts
  SET
    last_touch = lt.last_touch
  FROM
    lt
  WHERE
    contacts.id = lt.contact
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
