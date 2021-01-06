CREATE MATERIALIZED VIEW calendar.deals_closed_buyers AS (
  SELECT
    cdc.id,
    cdc.created_at,
    cdc.deleted_at,
    cdc.created_by,
    cdc.date,
    d.title,
    d.email,
    d.phone_number,
    cdc.deal,
    d.brand
  FROM
    calendar.deals_buyers d
    JOIN current_deal_context cdc
      ON cdc.deal = d.deal
  WHERE
    (
      (cdc.key = 'closing_date' AND cdc.date < now())
      OR cdc.key = 'lease_end'
    )
    AND deal_status_mask(d.deal, '{Withdrawn,Cancelled,"Contract Terminated"}'::text[], cdc.key, '{expiration_date}'::text[], '{Sold,Leased}'::text[]) IS NOT FALSE
)
