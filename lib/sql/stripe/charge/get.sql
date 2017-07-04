SELECT *
FROM stripe_charges
JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON stripe_charges.id = cid
ORDER BY t.ord
