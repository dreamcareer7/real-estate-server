CREATE OR REPLACE VIEW analytics.deals AS
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
            CASE deals_roles.role
              WHEN 'SellerAgent' THEN 'seller_agent'
              WHEN 'BuyerAgent' THEN 'buyer_agent'
              ELSE deals_roles.role::text
            END
          ) AS role,
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
          role IN (
            'BuyerAgent',
            'SellerAgent'
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
        )
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
      ('seller_agent'),
      ('buyer_agent'),
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
      seller_agent text,
      buyer_agent text,
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
    bo.branch_title,
    ct.full_address,
    ct.list_price,
    ct.sales_price,
    ct.leased_price,
    ct.original_price,
    ct.seller_agent,
    ct.buyer_agent,
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
  JOIN brands_branches AS bo
    ON ct.brand = bo.id