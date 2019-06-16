CREATE OR REPLACE FUNCTION delete_contact_attribute_def(id uuid, user_id uuid, _context text)
RETURNS setof uuid
LANGUAGE plpgsql
AS $$
  DECLARE
    searchable boolean;
    affected_contacts uuid[];
  BEGIN
    UPDATE
      contacts_attribute_defs
    SET
      deleted_at = now(),
      deleted_by = user_id,
      deleted_within = _context
    WHERE
      contacts_attribute_defs.id = $1
    RETURNING
      contacts_attribute_defs.searchable INTO searchable;

    WITH uca AS (
      UPDATE  /* We should delete contact attributes with the deleted attribute_def */
        contacts_attributes
      SET
        deleted_at = now(),
        deleted_by = user_id
      WHERE
        attribute_def = $1
      RETURNING
        contact
    )
    SELECT array_agg(DISTINCT contact) INTO affected_contacts FROM uca;

    IF searchable THEN
      UPDATE
        contacts
      SET
        updated_at = NOW(),
        updated_by = user_id,
        updated_within = _context,
        search_field = csf.search_field
      FROM
        get_search_field_for_contacts(affected_contacts) csf
      WHERE
        contacts.id = csf.contact;
    ELSE
      UPDATE  /* Set updated_at for affected contacts */
        contacts
      SET
        updated_at = now(),
        updated_by = user_id,
        updated_within = _context
      WHERE
        contacts.id = ANY(affected_contacts);
    END IF;

    RETURN QUERY SELECT * FROM unnest(affected_contacts) AS t(id);
  END;
$$
