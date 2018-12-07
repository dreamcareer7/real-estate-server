WITH cnt AS (
  SELECT
    ca.contact,
    ca.attribute_def,
    ca.is_partner,
    count(ca.id)
  FROM
    contacts AS c
    JOIN contacts_attributes AS ca
      ON ca.contact = c.id
  WHERE
    c.deleted_at IS NULL
    AND ca.deleted_at IS NULL
    AND ca.attribute_def = ANY($2::uuid[])
    AND brand = $1::uuid
  GROUP BY
    ca.contact,
    ca.attribute_def,
    ca.is_partner
)
SELECT
  cnt.attribute_def,
  cnt.is_partner,
  MAX(cnt.count) AS max_index
FROM
  cnt
GROUP BY
  cnt.attribute_def,
  cnt.is_partner
