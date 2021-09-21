WITH dr AS (
  SELECT
    DISTINCT ON(deals_roles.id)
    deals_roles.*,
    'deal_role' AS type,
    EXTRACT(EPOCH FROM deals_roles.created_at) AS created_at,
    EXTRACT(EPOCH FROM deals_roles.updated_at) AS updated_at,

    agents.mlsid as mlsid,

    deals_roles.agent AS agent,

    STDADDR_TO_JSON(deals_roles.current_address) AS current_address,
    STDADDR_TO_JSON(deals_roles.future_address)  AS future_address,
    STDADDR_TO_JSON(deals_roles.office_address)  AS office_address,


    (
    CASE WHEN
      deals_roles.role_type = 'Organization'
    THEN company_title
    ELSE
      ARRAY_TO_STRING(
        ARRAY[
          deals_roles.legal_prefix,
          -- Sice middle name comes in middle
          -- if it's set to '' postgres wont consider it as a null
          -- And therefore an empty space (as separator) will appear in between
          -- first and last name.
          -- This case is to consider '' as null to ARRAY_TO_STRING wont
          -- add a space separator.
          (CASE WHEN deals_roles.legal_first_name  = '' THEN NULL ELSE deals_roles.legal_first_name  END),
          (CASE WHEN deals_roles.legal_middle_name = '' THEN NULL ELSE deals_roles.legal_middle_name END),
          deals_roles.legal_last_name
        ], ' ', NULL
      )
    END
    ) as legal_full_name

  FROM deals_roles
  LEFT JOIN agents ON deals_roles.agent = agents.id

  WHERE deals_roles.id = ANY($1::uuid[])
  ORDER BY deals_roles.id
)

SELECT dr.* FROM dr
JOIN unnest($1::uuid[]) WITH ORDINALITY t(rid, ord) ON dr.id = rid
ORDER BY t.ord
