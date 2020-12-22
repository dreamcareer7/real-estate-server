DROP VIEW abbas.contacts_roles;
CREATE OR REPLACE VIEW abbas.contacts_roles AS (
  SELECT
    d.brand,
    c.id AS contact,
    d.deal,
    d.role
  FROM
    contacts AS c
    JOIN calendar.deals_buyers AS d
      ON ((c.email @> ARRAY[lower(d.email)]) OR (c.phone_number @> ARRAY[d.phone_number]))
  WHERE
    c.brand = d.brand
    AND c.deleted_at IS NULL
)
