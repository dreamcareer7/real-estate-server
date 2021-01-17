CREATE FUNCTION order_listings(listing_status) RETURNS integer
    AS 'SELECT CASE $1
      WHEN ''Coming Soon''::public.listing_status            THEN 0
      WHEN ''Active''::public.listing_status                 THEN 1

      WHEN ''Active Option Contract''::public.listing_status THEN 2
      WHEN ''Active Contingent''::public.listing_status      THEN 2
      WHEN ''Active Kick Out''::public.listing_status        THEN 2

      WHEN ''Pending''::public.listing_status         THEN 3
      WHEN ''Sold''::public.listing_status            THEN 3
      WHEN ''Leased''::public.listing_status          THEN 3

      ELSE 4
    END'
    IMMUTABLE
    LANGUAGE SQL
