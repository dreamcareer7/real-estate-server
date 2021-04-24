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
    d.brand,
    uuid_generate_v4() as unique_id
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
);

CREATE UNIQUE INDEX calendar_deals_closed_buyers_idx ON calendar.deals_closed_buyers(unique_id)
