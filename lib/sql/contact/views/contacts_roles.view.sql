CREATE OR REPLACE VIEW contacts_roles AS (
  SELECT
    db.brand,
    c.id AS contact,
    dr.deal,
    dr.id AS "role",
    dr.role AS role_name
  FROM
    contacts AS c
    JOIN deals_roles AS dr
      ON ((c.email @> ARRAY[lower(dr.email)]) OR (c.phone_number @> ARRAY[dr.phone_number]))
    JOIN deals_brands AS db
      ON ((dr.deal = db.deal) AND (db.brand = c.brand))
  WHERE c.deleted_at IS NULL
    AND dr.deleted_at IS NULL
)
