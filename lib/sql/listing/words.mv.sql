CREATE MATERIALIZED VIEW words AS
  SELECT word, ndoc as occurances FROM ts_stat(
    'SELECT to_tsvector(''simple'', address) FROM listings_filters'
  );

CREATE INDEX words_idx ON words USING gin(word gin_trgm_ops);