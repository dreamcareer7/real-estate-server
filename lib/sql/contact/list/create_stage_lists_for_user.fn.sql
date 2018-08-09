CREATE OR REPLACE FUNCTION public.create_stage_lists_for_user(uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
AS $function$
  WITH default_lists AS (
    SELECT
      $1::uuid AS "user",
      now() - (5 - row_number() over ()) * '1 seconds'::interval AS created_at,
      j.value AS name,
      '[]'::jsonb || to_jsonb(j.*) AS filters,
      true AS is_pinned
    FROM (
      SELECT
        cad.id AS attribute_def,
        false AS invert,
        t.title AS value
      FROM
        contacts_attribute_defs AS cad
        CROSS JOIN unnest('{General,"Warm List", "Hot List", "Past Client"}'::text[]) AS t(title)
      WHERE
        cad.name = 'stage'
    ) AS j

    UNION ALL

    SELECT
      $1::uuid AS "user",
      now() - (5 - row_number() over ()) * '1 seconds'::interval AS created_at,
      j.value AS name,
      '[]'::jsonb || to_jsonb(j.*) AS filters,
      true AS is_pinned
    FROM (
      SELECT
        cad.id AS attribute_def,
        false AS invert,
        'IOSAddressBook' AS value
      FROM
        contacts_attribute_defs AS cad
      WHERE
        cad.name = 'source_type'
    ) AS j
  )
  INSERT INTO contact_search_lists
    ("user", created_at, name, filters, is_pinned)
  SELECT
    *
  FROM
    default_lists
  RETURNING
    id
$function$