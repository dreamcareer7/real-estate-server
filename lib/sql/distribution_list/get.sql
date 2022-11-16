SELECT
  distribution_lists.id,
  distribution_lists.email,
  distribution_lists.first_name,
  distribution_lists.last_name,
  distribution_lists.title,
  distribution_lists.city,
  distribution_lists.state,
  distribution_lists.postal_code,
  distribution_lists.country,
  distribution_lists.phone,
  'distribution_list' AS TYPE,
  EXTRACT(EPOCH FROM distribution_lists.created_at) AS created_at,
  EXTRACT(EPOCH FROM distribution_lists.updated_at) AS updated_at,
  EXTRACT(EPOCH FROM distribution_lists.deleted_at) AS deleted_at
FROM
  distribution_lists
  JOIN unnest($1::uuid[])
  WITH ORDINALITY t (eid, ord) ON distribution_lists.id = eid
ORDER BY
  t.ord
