CREATE OR REPLACE FUNCTION delete_crm_association_by_contact ()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
  BEGIN
    UPDATE
      crm_associations AS ca
    SET
      deleted_at = NOW()
    FROM
      deleted_contacts AS dc
    WHERE
      dc.deleted_at IS NOT NULL
      AND contact = dc.id;

    RETURN NULL;
  END;
$$
