const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TYPE brand_type
    ADD VALUE 'Region'`,

  'DROP VIEW analytics.roles',
  'DROP VIEW analytics.deals',
  'DROP VIEW analytics.mini_deals',
  'DROP VIEW brands_branches',

  `CREATE OR REPLACE VIEW brands_relations AS (
  SELECT id,
  (
    SELECT
      brands.name
    FROM
      brands as b
      JOIN brand_parents(brands.id) bp(id) using (id)
    WHERE
      brands.brand_type = 'Office'
    LIMIT 1
  ) AS office,

  (
    SELECT
      brands.name
    FROM
      brands as b
      JOIN brand_parents(brands.id) bp(id) using (id)
    WHERE
      brands.brand_type = 'Region'
    LIMIT 1
  ) AS region

  FROM
    brands
)`,

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
      WHERE
        cdc.deleted_at IS NULL
  )
  SELECT
    di.title,
    di.id,
    di.checklist,
    di.brand,
    di.deal_type,
    di.property_type,
    br.office,
    br.region,
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
    JOIN brands_relations AS br
      ON di.brand = br.id`,

  `CREATE OR REPLACE VIEW analytics.deals AS
  WITH ct AS (
    SELECT * FROM
    crosstab($$
      WITH real_deals AS (
        SELECT
          deals.*
        FROM
          deals
          JOIN brands ON brands.id = deals.brand
        WHERE
          deals.brand NOT IN(
            SELECT
              brand_children(id)
            FROM
              brands
            WHERE
              training IS TRUE
          )
          AND deals.faired_at IS NOT NULL
          AND brands.deleted_at IS NULL
          AND deals.deleted_at IS NULL
      ),
      roles AS (
        SELECT
          deals_roles.deal,
          (
            CASE WHEN
              (deals_roles.legal_prefix      <> '') IS NOT TRUE AND
              (deals_roles.legal_first_name  <> '') IS NOT TRUE AND
              (deals_roles.legal_middle_name <> '') IS NOT TRUE AND
              (deals_roles.legal_last_name   <> '') IS NOT TRUE
            THEN company_title
            ELSE
              ARRAY_TO_STRING(
                ARRAY[
                  deals_roles.legal_prefix,
                  deals_roles.legal_first_name,
                  deals_roles.legal_middle_name,
                  deals_roles.legal_last_name
                ], ' ', NULL
              )
            END
          ) as legal_full_name,
          real_deals.deal_type,
          real_deals.property_type,
          real_deals.listing,
          real_deals.brand,
          real_deals.title
        FROM
          deals_roles
          JOIN real_deals
            ON real_deals.id = deals_roles.deal
        WHERE
          role = (
            CASE
              WHEN deals.deal_type = 'Selling' THEN 'SellerAgent'
              WHEN deals.deal_type = 'Buying'  THEN 'BuyerAgent'
            END CASE
          )
      ),
      contexts AS (
        SELECT
          ctx.*,
          real_deals.deal_type,
          real_deals.property_type,
          real_deals.listing,
          real_deals.brand,
          real_deals.title
        FROM
          current_deal_context as ctx
          INNER JOIN real_deals
            ON real_deals.id = ctx.deal
        WHERE key IN (
          'full_address',
          'list_price',
          'sales_price',
          'leased_price',
          'original_price',
          'list_date',
          'expiration_date',
          'contract_date',
          'option_period',
          'financing_due',
          'title_due',
          't47_due',
          'closing_date',
          'possession_date',
          'lease_executed',
          'lease_application_date',
          'lease_begin',
          'lease_end',
          'year_built',
          'listing_status'
        ) AND ctx.deleted_at IS NULL
      ),
      ctx_roles_union AS (
        (
          SELECT
            ctx.deal AS id,
            ctx.deal_type,
            ctx.property_type,
            ctx.listing,
            ctx.brand,
            ctx.title,
            ctx.key,
            COALESCE(ctx.text, ctx.number::text, ctx.date::text) as "value"
          FROM
            contexts AS ctx
        )
        UNION ALL (
          SELECT
            roles.deal AS id,
            roles.deal_type,
            roles.property_type,
            roles.listing,
            roles.brand,
            roles.title,
            roles.role,
            legal_full_name as "value"
          FROM
            roles
        )
      )
      SELECT
        *
      FROM
        ctx_roles_union
      ORDER BY
        id
    $$, $$ VALUES
      ('full_address'),
      ('list_price'),
      ('sales_price'),
      ('leased_price'),
      ('original_price'),
      ('agent'),
      ('list_date'),
      ('expiration_date'),
      ('contract_date'),
      ('option_period'),
      ('financing_due'),
      ('title_due'),
      ('t47_due'),
      ('closing_date'),
      ('possession_date'),
      ('lease_executed'),
      ('lease_application_date'),
      ('lease_begin'),
      ('lease_end'),
      ('year_built'),
      ('listing_status')
    $$) t(
      id uuid,
      deal_type deal_type,
      property_type deal_property_type,
      listing uuid,
      brand uuid,
      title text,
      full_address text,
      list_price double precision,
      sales_price double precision,
      leased_price double precision,
      original_price double precision,
      agent text,
      list_date timestamptz,
      expiration_date timestamptz,
      contract_date timestamptz,
      option_period timestamptz,
      financing_due timestamptz,
      title_due timestamptz,
      t47_due timestamptz,
      closing_date timestamptz,
      possession_date timestamptz,
      lease_executed timestamptz,
      lease_application_date timestamptz,
      lease_begin timestamptz,
      lease_end timestamptz,
      year_built double precision,
      listing_status text
    )
  )
  SELECT ct.id,
    ct.deal_type,
    ct.property_type,
    ct.listing,
    ct.brand,
    ct.title,
    br.office,
    br.region,
    ct.full_address,
    ct.list_price,
    ct.sales_price,
    ct.leased_price,
    ct.original_price,
    ct.agent,
    ct.list_date::date,
    ct.expiration_date,
    ct.contract_date::date,
    ct.option_period,
    ct.financing_due,
    ct.title_due,
    ct.t47_due,
    ct.closing_date::date,
    date_trunc('year', ct.closing_date)::date AS closing_date_year,
    date_trunc('quarter', ct.closing_date)::date AS closing_date_quarter,
    date_trunc('month', ct.closing_date)::date AS closing_date_month,
    date_trunc('week', ct.closing_date)::date AS closing_date_week,
    date_trunc('day', ct.closing_date)::date AS closing_date_day,
    ct.possession_date,
    ct.lease_executed,
    ct.lease_application_date,
    ct.lease_begin,
    ct.lease_end,
    ct.year_built,
    ct.listing_status
  FROM
    ct
  JOIN brands_relations AS br
    ON ct.brand = br.id`,

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
