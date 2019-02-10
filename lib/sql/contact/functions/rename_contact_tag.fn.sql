CREATE OR REPLACE FUNCTION rename_crm_tag(brand_id uuid, user_id uuid, "from" text, "to" text)
RETURNS TABLE (
  contact uuid
)
LANGUAGE SQL AS $$
  UPDATE
    crm_tags
  SET
    tag = "from"
  WHERE
    tag = "to"
    AND deleted_at IS NULL;

  UPDATE
    contacts_attributes AS ca
  SET
    text = $3
  FROM
    contacts AS c
  WHERE
    c.brand = $1
    AND ca.contact = c.id
    AND ca.text ILIKE $2
  RETURNING
    ca.contact
$$;
