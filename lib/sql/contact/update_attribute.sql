UPDATE contacts_attributes
SET attribute_type = $3,
    attribute = $4
WHERE contact = $1 AND
      id = $2
