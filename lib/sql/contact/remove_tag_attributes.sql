DELETE FROM contacts_attributes
WHERE attribute_type = 'tag'
AND attribute->>'tag' = ANY($1)
AND contact = ANY($2)