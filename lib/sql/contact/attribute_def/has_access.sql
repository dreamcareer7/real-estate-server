SELECT
  id,
  contacts_attribute_defs."user" = $2 AS "read",
  contacts_attribute_defs."user" = $2 AS "write"
FROM
  contacts_attribute_defs
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON contacts_attribute_defs.id = did
