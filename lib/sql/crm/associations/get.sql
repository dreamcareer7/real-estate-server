WITH ub AS (
  SELECT brand FROM user_brands($2)
)
SELECT
  id,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  created_by,
  a_ids.brand,
  association_type,
  crm_task,
  deal,
  contact,
  listing,
  index,
  metadata,
  'crm_association' as "type"
FROM
  (
    (
      SELECT
        crm_associations.id,
        deals.brand,
        NULL::uuid AS "user"
      FROM
        crm_associations
      JOIN deals
        ON crm_associations.deal = deals.id
      JOIN ub
        ON deals.brand = ub.brand
      WHERE 
        crm_associations.association_type = 'deal'
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
      JOIN ub
        ON contacts.brand = ub.brand
      WHERE
        crm_associations.association_type = 'contact'
    )
    UNION
    (
      SELECT
        crm_associations.id,
        NULL::uuid AS brand,
        $2::uuid AS "user"
      FROM
        crm_associations
        JOIN listings
          ON listings.id = crm_associations.listing
      WHERE
        crm_associations.association_type = 'listing'
    )
  ) AS a_ids
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON a_ids.id = did
JOIN crm_associations USING (id)
ORDER BY t.ord
