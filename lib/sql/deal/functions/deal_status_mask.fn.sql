CREATE OR REPLACE FUNCTION deal_status_mask(deal_id uuid, mask text[], "key" text, masked_contexts text[], context_mask text[]) RETURNS boolean
LANGUAGE SQL
STABLE
AS $$
  SELECT
    (cdc.text <> ALL($2::text[])) AND (($3 <> ALL($4::text[])) OR (cdc.text <> ALL($5::text[])))
  FROM
    deals
    JOIN current_deal_context cdc
      ON cdc.deal = deals.id
  WHERE
    deals.id = $1
    AND ((
      deals.deal_type = 'Selling'
      AND cdc.key = 'listing_status'
    ) OR (
      deals.deal_type = 'Buying'
      AND cdc.key = 'contract_status'
    ))
  LIMIT 1
$$;
