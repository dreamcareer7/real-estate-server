WITH ub AS (
  SELECT brand FROM user_brands($2)
),
a_ids AS (
  (
    SELECT
      crm_associations.*
    FROM
      crm_associations
    INNER JOIN
      deals
    ON
      crm_associations.deal = deals.id
    WHERE 
      association_type = 'deal'
      AND EXISTS (SELECT brand FROM ub WHERE ub.brand = brand)
  )
  UNION
  (
    SELECT
      crm_associations.*
    FROM
      crm_associations
    WHERE
      association_type <> 'deal'
  )
)
SELECT
  id,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  association_type,
  crm_task,
  -- contact_note,
  touch,
  deal,
  contact,
  listing,
  'crm_association' as "type"
FROM
  a_ids
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON a_ids.id = did
ORDER BY t.ord
