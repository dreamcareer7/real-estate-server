SELECT
  id,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  association_type,
  crm_task,
  -- contact_note,
  activity,
  deal,
  contact,
  listing,
  'crm_association' as "type"
FROM
  crm_associations
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON crm_associations.id = did
ORDER BY t.ord
