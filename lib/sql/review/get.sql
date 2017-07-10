WITH reviews AS (
  SELECT
  DISTINCT ON(reviews.id)
  reviews.*,
  'review' as type,
  reviews_history.status as status,
  reviews_history.created_at as updated_at,
  reviews_history.created_by as updated_by
  FROM reviews
  JOIN reviews_history ON reviews.id = reviews_history.review
  WHERE reviews.id = ANY($1::uuid[])
  ORDER BY reviews.id DESC
)
SELECT reviews.* FROM reviews
JOIN unnest($1::uuid[]) WITH ORDINALITY t(rid, ord) ON reviews.id = rid
ORDER BY t.ord
