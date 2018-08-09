CREATE OR REPLACE FUNCTION public.create_stage_lists_for_user(uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
AS $function$
  WITH j AS (
    SELECT
      cad.id AS attribute_def,
      false AS invert,
      t.title AS value
    FROM
      contacts_attribute_defs AS cad
      CROSS JOIN unnest('{General,"Warm List", "Hot List", "Past Client"}'::text[]) AS t(title)
    WHERE
      cad.name = 'stage'
  )
  INSERT INTO contact_search_lists
    ("user", created_at, name, filters, is_pinned)
  SELECT
    $1::uuid AS "user",
    now() - (row_number() over ()) * '1 seconds'::interval AS created_at,
    j.value AS name,
    row_to_json(j.*) AS filters,
    false AS is_pinned
  FROM
    j
  RETURNING id
$function$