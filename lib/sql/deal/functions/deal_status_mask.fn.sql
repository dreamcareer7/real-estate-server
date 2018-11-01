CREATE OR REPLACE FUNCTION deal_status_mask(deal_id uuid, mask text[]) RETURNS boolean
LANGUAGE SQL
STABLE
AS $$
  SELECT
    cdc.text <> ALL(mask)
  FROM
    deals
    JOIN current_deal_context cdc
      ON cdc.deal = deals.id
  WHERE
    deals.id = $1
    AND cdc.key = 'listing_status'
  LIMIT 1
$$;
