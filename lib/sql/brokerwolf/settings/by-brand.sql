SELECT * FROM brokerwolf_settings WHERE brand IN(
  SELECT brand_parents($1)
)
