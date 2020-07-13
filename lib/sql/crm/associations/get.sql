WITH ub AS (
  SELECT brand FROM user_brands($2, NULL)
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
  email,
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
      WHERE
        crm_associations.association_type = 'deal'
        AND crm_associations.id = ANY($1::uuid[])
        AND (
          EXISTS (
            SELECT
              brand
            FROM
              ub
            WHERE
              ub.brand = deals.brand
          )
          OR
          EXISTS (
            SELECT
              dr.brand
            FROM
              ub
              JOIN deals_roles AS dr
                ON dr.brand = ub.brand
              LEFT JOIN deals_checklists AS dc
                ON dr.checklist = dc.id
            WHERE
              deals.id = dr.deal
              AND dr.deleted_at IS NULL
              AND (
                dc.id IS NULL
                OR (
                  dc.terminated_at IS NULL
                  AND dc.deactivated_at IS NULL
                )
              )
          )
        )
    )
    UNION ALL
    (
      SELECT
        crm_associations.id,
        contacts.brand,
        NULL::uuid AS "user"
      FROM
        crm_associations
        JOIN contacts
          ON crm_associations.contact = contacts.id
      WHERE
        crm_associations.association_type = 'contact'
        AND crm_associations.id = ANY($1::uuid[])
        AND EXISTS (
          SELECT
            brand
          FROM
            ub
          WHERE
            ub.brand = contacts.brand
        )
    )
    UNION ALL
    (
      SELECT
        crm_associations.id,
        email_campaigns.brand,
        NULL::uuid AS "user"
      FROM
        crm_associations
        JOIN email_campaigns
          ON crm_associations.email = email_campaigns.id
      WHERE
        crm_associations.association_type = 'email'
        AND crm_associations.id = ANY($1::uuid[])
        AND EXISTS (
          SELECT
            brand
          FROM
            ub
          WHERE
            ub.brand = email_campaigns.brand
        )
    )
    UNION ALL
    (
      SELECT
        crm_associations.id,
        crm_associations.brand,
        $2::uuid AS "user"
      FROM
        crm_associations
        JOIN listings
          ON listings.id = crm_associations.listing
      WHERE
        crm_associations.association_type = 'listing'
        AND crm_associations.id = ANY($1::uuid[])
    )
  ) AS a_ids
JOIN unnest($1::uuid[]) WITH ORDINALITY t(did, ord) ON a_ids.id = did
JOIN crm_associations USING (id)
ORDER BY t.ord
