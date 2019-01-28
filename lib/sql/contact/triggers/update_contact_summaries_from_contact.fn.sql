CREATE OR REPLACE FUNCTION update_contact_summaries_from_contact() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
  BEGIN
    UPDATE
      contacts_summaries AS cs
    SET
      "user" = uc."user",
      brand = uc.brand,
      updated_at = uc.updated_at,
      display_name = uc.display_name,
      sort_field = uc.sort_field,
      partner_name = uc.partner_name,
      search_field = to_tsvector('english', uc.searchable_field),
      next_touch = uc.next_touch,
      last_touch = uc.last_touch
    FROM
      updated_contacts uc
    WHERE
      uc.id = cs.id
      AND uc.deleted_at IS NULL;

    RETURN NULL;
  END;
$$
