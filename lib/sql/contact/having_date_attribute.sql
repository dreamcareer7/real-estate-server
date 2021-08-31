SELECT DISTINCT
  c.id
FROM contacts_attributes_date AS cad
JOIN contacts AS c ON c.id = cad.contact
WHERE
  cad.deleted_at IS NULL AND
  c.deleted_at IS NULL AND
  c.brand = $1::uuid AND
  cad.attribute_type = $1::text
