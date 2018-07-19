CREATE OR REPLACE FUNCTION delete_contact_attribute_defs(ids uuid[])
RETURNS setof uuid
LANGUAGE plpgsql
AS $$
  DECLARE
    searchable boolean;
    affected_contacts uuid[];
  BEGIN
    WITH u AS (
      UPDATE
        contacts_attribute_defs
      SET
        deleted_at = now()
      WHERE
        contacts_attribute_defs.id = ANY(ids)
      RETURNING
        contacts_attribute_defs.searchable
     )
     SELECT SUM(searchable::int) > 0 INTO searchable;

    WITH uca AS (
      UPDATE  /* We should delete contact attributes with the deleted attribute_def */
        contacts_attributes
      SET
        deleted_at = now()
      WHERE
        attribute_def = ANY(ids)
      RETURNING
        contact
    )
    SELECT array_agg(DISTINCT contact) INTO affected_contacts FROM uca;

    IF searchable THEN
      UPDATE
        contacts
      SET
        updated_at = NOW(),
        searchable_field = csf.searchable_field
      FROM
        get_searchable_field_for_contacts(affected_contacts) csf
      WHERE
        contacts.id = csf.contact;
    ELSE
      UPDATE  /* Set updated_at for affected contacts */
        contacts
      SET
        updated_at = now()
      WHERE
        contacts.id = ANY(affected_contacts);
    END IF;

    RETURN QUERY SELECT * FROM unnest(affected_contacts) AS t(id);
  END;
$$