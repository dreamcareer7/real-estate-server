WITH ub AS (
  SELECT brand FROM user_brands($2)
),
a_ids AS (
  (
    SELECT
      crm_associations.id,
      deals.brand,
      NULL::uuid AS "user"
    FROM
      crm_associations
    JOIN deals
      ON crm_associations.deal = deals.id
    JOIN ub USING (brand)
    WHERE 
      association_type = 'deal'
  )
  UNION
  (
    SELECT
      crm_associations.id,
      contacts.brand,
      NULL::uuid AS "user"
    FROM
      crm_associations
    JOIN contacts
      ON crm_associations.contact = contacts.id
    JOIN ub USING (brand)
    WHERE 
      association_type = 'contact'
  )
  UNION
  (
    SELECT
      crm_associations.*
    FROM
      crm_associations
    WHERE
      association_type = 'listing'
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
