const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE brands_property_types (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamp with time zone DEFAULT CLOCK_TIMESTAMP(),
    updated_at timestamp with time zone DEFAULT CLOCK_TIMESTAMP(),
    deleted_at timestamp with time zone,
    brand uuid NOT NULL REFERENCES brands(id),
    label TEXT,
    is_lease BOOLEAN NOT NULL
  )`,

  `INSERT INTO brands_property_types (brand, label, is_lease)
    WITH pt AS (
      SELECT
      brands.id as brand,
      UNNEST(ENUM_RANGE(NULL::deal_property_type)) as label
      FROM brands
    )
    SELECT
      brand,
      label,
      label::text ILIKE '%Lease%' as is_lease
    FROM pt`,


  /*
   * Checklists
   */
  `CREATE TYPE checklist_type
    AS ENUM('Buying', 'Selling', 'Offer')`,
  'ALTER TABLE brands_checklists ADD COLUMN dynamic_property_type uuid REFERENCES brands_property_types(id)',
  'ALTER TABLE brands_checklists ADD COLUMN checklist_type checklist_type',

  `UPDATE brands_checklists SET dynamic_property_type = (
    SELECT id FROM brands_property_types bpt
    WHERE bpt.label = brands_checklists.property_type::text
    AND   bpt.brand = (SELECT * FROM brand_parents(brands_checklists.brand) ORDER BY 1 DESC LIMIT 1)
  )`,

  'ALTER TABLE brands_checklists ALTER dynamic_property_type SET NOT NULL',

  'ALTER TABLE brands_checklists DROP property_type CASCADE',
  'ALTER TABLE brands_checklists RENAME dynamic_property_type TO property_type',

  'UPDATE brands_checklists SET checklist_type = deal_type::text::checklist_type',

  `INSERT INTO brands_checklists
  (brand, title, "order", property_type, is_terminatable, is_deactivatable, tab_name, checklist_type)
  SELECT brand, 'Offer', "order", property_type, is_terminatable, is_deactivatable, tab_name, 'Offer'
  FROM brands_checklists
  WHERE deleted_at IS NULL
  AND checklist_type = 'Buying'`,

  'ALTER TABLE brands_checklists DROP deal_type',
  'ALTER TABLE brands_checklists ALTER checklist_type SET NOT NULL',

  /*
   * Deals
   */
  'ALTER TABLE deals ADD dynamic_property_type uuid REFERENCES brands_property_types(id)',

  `UPDATE deals SET dynamic_property_type = (
    SELECT id FROM brands_property_types bpt
    WHERE bpt.label = deals.property_type::text
    AND   bpt.brand IN(
      SELECT * FROM brand_parents(brand) ORDER BY 1 DESC LIMIT 1
    )
  )`,

  'ALTER TABLE deals ALTER dynamic_property_type SET NOT NULL',

  'ALTER TABLE deals DROP property_type',

  'ALTER TABLE deals RENAME dynamic_property_type TO property_type',

  /*
   * Contexts
   */
  `CREATE TABLE brands_contexts_checklists (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    context uuid NOT NULL REFERENCES brands_contexts(id),
    checklist uuid NOT NULL REFERENCES brands_checklists(id),
    is_required BOOLEAN NOT NULL
  )`,

  `INSERT INTO brands_contexts_checklists
(context, checklist, is_required)

WITH contexts AS (
  SELECT
    id as context,
    brand,
    unnest(required) as property_type,
    true as is_required,
    required @> ARRAY['Buying']::deal_context_condition[] as is_buying,
    required @> ARRAY['Selling']::deal_context_condition[] as is_selling
  FROM brands_contexts

  UNION

  SELECT
    id as context,
    brand,
    unnest(optional) as property_type,
    false as is_required,
    optional @> ARRAY['Buying']::deal_context_condition[] as is_buying,
    optional @> ARRAY['Selling']::deal_context_condition[] as is_selling
  FROM brands_contexts
)
SELECT
  contexts.context,
  bc.id as property_type,
  contexts.is_required
FROM contexts
JOIN brands_property_types bpt
    ON contexts.property_type = bpt.label::deal_context_condition
    AND contexts.brand IN (
      SELECT * FROM brand_parents(bpt.brand)
    )
JOIN brands_checklists bc ON bc.property_type = bpt.id
AND (
       (bc.checklist_type = 'Selling'  AND contexts.is_selling)
    OR (bc.checklist_type = 'Buying' AND contexts.is_buying)
)`,

  'ALTER TABLE brands_contexts DROP required',
  'ALTER TABLE brands_contexts DROP optional',
  /*
   * Statuses
   */
  `CREATE TABLE brands_deal_statuses_checklists (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    status uuid NOT NULL REFERENCES brands_deal_statuses(id),
    checklist uuid NOT NULL REFERENCES brands_checklists(id)
  )`,

  `INSERT INTO brands_deal_statuses_checklists
  (status, checklist)
  WITH statuses AS (
    SELECT
      *,
      UNNEST(deal_types) as deal_type,
      UNNEST(property_types) as property_type
    FROM brands_deal_statuses
    WHERE deleted_at IS NULL
  )

  SELECT
    statuses.id,
    bc.id
  FROM statuses
  JOIN brands_property_types bpt ON bpt.label = statuses.property_type::text
  AND bpt.brand = statuses.brand
  JOIN brands_checklists bc ON bc.property_type = bpt.id
  AND bc.checklist_type::text = statuses.deal_type::text
  `,

  'ALTER TABLE brands_deal_statuses DROP property_types',
  'ALTER TABLE brands_deal_statuses DROP deal_types',

  /*
   * View
   */

  `CREATE OR REPLACE VIEW analytics.mini_deals AS
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
      d.deal_type,
      bc.checklist_type,
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
      WHERE
        cdc.deleted_at IS NULL
  )
  SELECT
    di.title,
    di.id,
    di.checklist,
    di.brand,
    di.deal_type,
    di.checklist_type,
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
`,

  `DELETE FROM brands_property_types WHERE id NOT IN(
    SELECT property_type FROM brands_checklists
  )`,

  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
