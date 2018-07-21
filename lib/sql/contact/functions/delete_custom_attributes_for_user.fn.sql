CREATE OR REPLACE FUNCTION public.delete_attribute_defs_for_user(text)
  RETURNS setof int
  LANGUAGE plpgsql
AS $function$
  DECLARE
    "user_id" uuid;
  BEGIN
    SELECT id INTO "user_id" FROM users WHERE email = $1;

    RETURN QUERY WITH attr_defs AS (
      SELECT
        ARRAY_AGG(id) AS ids
      FROM
        contacts_attribute_defs
      WHERE
        "user" = user_id
        AND global IS FALSE
    )
    SELECT 1 FROM attr_defs, delete_contact_attribute_defs(attr_defs.ids);
  END;
$function$