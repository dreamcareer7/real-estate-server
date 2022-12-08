SELECT
  distribution_lists_contacts.id,
  distribution_lists_contacts.email,
  distribution_lists_contacts.first_name,
  distribution_lists_contacts.last_name,
  distribution_lists_contacts.title,
  distribution_lists_contacts.city,
  distribution_lists_contacts.state,
  distribution_lists_contacts.postal_code,
  distribution_lists_contacts.country,
  distribution_lists_contacts.phone,
  'distribution_lists_contacts_contacts' AS TYPE,
  EXTRACT(EPOCH FROM distribution_lists_contacts.created_at) AS created_at,
  EXTRACT(EPOCH FROM distribution_lists_contacts.updated_at) AS updated_at,
  EXTRACT(EPOCH FROM distribution_lists_contacts.deleted_at) AS deleted_at
FROM
  distribution_lists_contacts
  JOIN unnest($1::uuid[])
  WITH ORDINALITY t (eid, ord) ON distribution_lists_contacts.id = eid
ORDER BY
  t.ord
