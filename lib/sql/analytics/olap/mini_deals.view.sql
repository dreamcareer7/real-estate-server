CREATE OR REPLACE VIEW analytics.mini_deals AS
  WITH training_brands AS (
    SELECT
      bc.id
    FROM
      brands,
      brand_children(brands.id) bc(id)
    WHERE
      training IS TRUE
  ), deal_info AS (
    SELECT
      d.id,
      d.title,
      d.brand,
      bc.deal_type,
      bc.property_type,
      dc.id AS checklist
    FROM
      deals d
      JOIN deals_checklists dc
        ON d.id = dc.deal
      JOIN brands_checklists bc
        ON bc.id = dc.origin
    WHERE
      d.faired_at IS NOT NULL
      AND d.brand NOT IN (SELECT id FROM training_brands)
      AND dc.deleted_at IS NULL
      AND dc.deactivated_at IS NULL
      AND dc.terminated_at IS NULL
  ), agent_info AS (
    SELECT
      dr.deal,
      d.checklist,
      dr.role,
      array_to_string(
        array_remove(ARRAY[
          dr.legal_first_name,
          dr.legal_middle_name,
          dr.legal_last_name
        ], ''),
        ' ',
        NULL
      ) AS name
    FROM
      deals_roles dr
      JOIN deal_info d
        ON d.id = dr.deal
    WHERE
      dr.deleted_at IS NULL
      AND dr.role = ANY('{BuyerAgent,SellerAgent}'::deal_role[])
      AND (dr.checklist IS NULL OR dr.checklist = d.checklist)
  ), role_info AS (
    SELECT
      dr.deal,
      d.checklist,
      dr.role,
      string_agg(
        array_to_string(
          array_remove(ARRAY[
            dr.legal_first_name,
            dr.legal_middle_name,
            dr.legal_last_name
          ], ''),
          ' ',
          NULL
        ) || ' (' || array_to_string(ARRAY[
          dr.email,
          dr.phone_number
        ], ', ', NULL) || ')',
      ', ') AS info
    FROM
      deals_roles dr
      JOIN deal_info d
        ON d.id = dr.deal
    WHERE
      dr.deleted_at IS NULL
      AND dr.role = ANY('{Buyer,Seller}'::deal_role[])
      AND (dr.checklist IS NULL OR dr.checklist = d.checklist)
    GROUP BY
      dr.deal,
      d.checklist,
      dr.role
  ), context_info AS (
    SELECT
      cdc.*
    FROM
      current_deal_context cdc
      JOIN deal_info di
        ON cdc.deal = di.id
  )
  SELECT
    di.title,
    di.id,
    di.checklist,
    di.brand,
    di.deal_type,
    di.property_type,
    bo.branch_title,
    (SELECT name FROM agent_info AS ri WHERE role = 'BuyerAgent'::deal_role AND ri.deal = di.id AND (ri.checklist IS NULL OR ri.checklist = di.checklist) LIMIT 1) AS buyer_agent,
    (SELECT name FROM agent_info AS ri WHERE role = 'SellerAgent'::deal_role AND ri.deal = di.id AND (ri.checklist IS NULL OR ri.checklist = di.checklist) LIMIT 1) AS seller_agent,
    (SELECT info FROM role_info AS ri WHERE role = 'Seller'::deal_role AND ri.deal = di.id AND (ri.checklist IS NULL OR ri.checklist = di.checklist) LIMIT 1) AS sellers,
    (SELECT info FROM role_info AS ri WHERE role = 'Buyer'::deal_role AND ri.deal = di.id AND (ri.checklist IS NULL OR ri.checklist = di.checklist) LIMIT 1) AS buyers,
    (SELECT text FROM context_info AS ci WHERE key = 'full_address' AND ci.deal = di.id LIMIT 1) AS full_address,
    (SELECT number FROM context_info AS ci WHERE key = 'sales_price' AND ci.deal = di.id LIMIT 1) AS sales_price,
    (SELECT number FROM context_info AS ci WHERE key = 'list_price' AND ci.deal = di.id LIMIT 1) AS list_price,
    (SELECT date FROM context_info AS ci WHERE key = 'closing_date' AND ci.deal = di.id LIMIT 1) AS closing_date,
    (SELECT date FROM context_info AS ci WHERE key = 'contract_date' AND ci.deal = di.id LIMIT 1) AS contract_date,
    (SELECT date FROM context_info AS ci WHERE key = 'list_date' AND ci.deal = di.id LIMIT 1) AS list_date
  FROM
    deal_info di
    JOIN brands_branches AS bo
      ON di.brand = bo.id
