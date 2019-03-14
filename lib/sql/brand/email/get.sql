SELECT brands_emails.*,
  'brand_email' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at

FROM brands_emails
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_emails.id = bid
ORDER BY t.ord
