WITH reviews AS (
  SELECT
  DISTINCT ON(reviews.id)
  reviews.*,
  'review' as type,
  reviews_history.status as status,
  EXTRACT(EPOCH FROM reviews.created_at) AS created_at,
  EXTRACT(EPOCH FROM reviews_history.created_at) AS updated_at,
  reviews_history.created_by as updated_by
  FROM reviews
  JOIN reviews_history ON reviews.id = reviews_history.review
  ORDER BY reviews.id DESC, reviews_history.created_at DESC
)
SELECT reviews.* FROM reviews
JOIN unnest($1::uuid[]) WITH ORDINALITY t(rid, ord) ON reviews.id = rid
ORDER BY t.ord
