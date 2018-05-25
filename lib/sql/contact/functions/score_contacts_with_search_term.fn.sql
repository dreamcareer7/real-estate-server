CREATE OR REPLACE FUNCTION score_contacts_with_search_term(contact contacts, q text[])
RETURNS int
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT
    SUM((contact.searchable_field ILIKE '%' || term ||  '%')::int)::int "score"
  FROM
    unnest(q) terms(term)
$$