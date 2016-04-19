CREATE FUNCTION order_listings(listing_status) RETURNS integer
    AS 'SELECT CASE $1
      WHEN ''Active''::listing_status                 THEN 1
      WHEN ''Active Option Contract''::listing_status THEN 1
      WHEN ''Active Contingent''::listing_status      THEN 1
      WHEN ''Active Kick Out''::listing_status        THEN 1

      WHEN ''Pending''::listing_status         THEN 2
      WHEN ''Sold''::listing_status            THEN 2
      WHEN ''Leased''::listing_status          THEN 2

      ELSE 3
    END'
    IMMUTABLE
    LANGUAGE SQL