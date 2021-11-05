const db = require('../lib/utils/db')

const migrations = [
  'DROP MATERIALIZED VIEW analytics.deals',

  `CREATE MATERIALIZED VIEW analytics.deals AS
  WITH ct AS (
    SELECT * FROM
    crosstab($$
      WITH real_deals AS (
        SELECT
          deals.id,
          deals.created_at,
          deals.deal_type,
          deals.faired_at,
          deals.listing,
          deals.brand,
          deals.title,
          brands_property_types.label as property_type
        FROM
          deals
          JOIN brands ON brands.id = deals.brand
          JOIN brands_property_types ON deals.property_type = brands_property_types.id
        WHERE
          deals.brand NOT IN(
            SELECT
              brand_children(id)
            FROM
              brands
            WHERE
              training IS TRUE
          )
          AND brands.deleted_at IS NULL
          AND deals.deleted_at IS NULL
      ),
      agent AS (
        SELECT
          deals_roles.deal,
          real_deals.created_at as deal_created_at,
          deals_roles.user,
          real_deals.deal_type,
          real_deals.faired_at,
          real_deals.property_type,
          real_deals.listing,
          real_deals.brand,
          real_deals.title,
          deals_roles.role
        FROM
          deals_roles
          JOIN real_deals
            ON real_deals.id = deals_roles.deal
        WHERE
          role = (
            CASE
              WHEN real_deals.deal_type = 'Selling' THEN 'SellerAgent'::deal_role
              WHEN real_deals.deal_type = 'Buying'  THEN 'BuyerAgent'::deal_role
            END
          )
      ),
      contexts AS (
        SELECT
          ctx.*,
          real_deals.created_at as deal_created_at,
          real_deals.deal_type,
          real_deals.faired_at,
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
          'lease_price',
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
          'listing_status',
          'contract_status'
        ) AND ctx.deleted_at IS NULL
      ),
      ctx_roles_union AS (
        (
          SELECT
            ctx.deal AS id,
            ctx.deal_created_at,
            ctx.deal_type,
            ctx.faired_at,
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
            agent.deal AS id,
            agent.deal_created_at as created_at,
            agent.deal_type,
            agent.faired_at,
            agent.property_type,
            agent.listing,
            agent.brand,
            agent.title,
            'agent' as role,
            "user"::text as "value"
          FROM
            agent
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
      ('lease_price'),
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
      ('listing_status'),
      ('contract_status')
    $$) t(
      id uuid,
      created_at timestamptz,
      deal_type deal_type,
      faired_at timestamptz,
      property_type text,
      listing uuid,
      brand uuid,
      title text,
      full_address text,
      list_price double precision,
      lease_price double precision,
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
      listing_status text,
      contract_status text
    )
  )
  SELECT ct.id,
    ct.created_at,
    ct.deal_type,
    (
      CASE 
        WHEN ct.faired_at IS NULL THEN 'Draft'
        ELSE                           'Published'
      END
    ) as visibility,
    ct.property_type,
    ct.listing,
    ct.brand,
    ct.title,
    br.office,
    br.region,
    ct.full_address,
    ct.list_price,
    ct.lease_price,
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
    ct.listing_status,
    ct.contract_status,
    deal_statuses.text as status
  FROM
    ct
  JOIN brands_relations AS br
    ON ct.brand = br.id
  LEFT JOIN deal_statuses ON ct.id = deal_statuses.deal;`,

  'CREATE UNIQUE INDEX analytics_deals_idx ON analytics.deals(id)'
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
