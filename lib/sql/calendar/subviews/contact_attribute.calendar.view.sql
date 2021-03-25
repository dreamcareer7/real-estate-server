CREATE OR REPLACE VIEW calendar.contact_attribute AS (
  SELECT
    ca.id::text,
    ca.created_by,
    ca.created_at,
    ca.updated_at,
    ca.deleted_at,
    contacts.deleted_at AS parent_deleted_at,
    GREATEST(ca.created_at, ca.updated_at, LEAST(contacts.deleted_at, ca.deleted_at)) AS last_updated_at,
    'contact_attribute' AS object_type,
    COALESCE(cad.name, cad.label) AS event_type,
    (CASE
      WHEN attribute_type = 'birthday' AND is_partner IS TRUE THEN 'Spouse Birthday'
      WHEN attribute_type = 'child_birthday' THEN COALESCE('Child Birthday (' || ca.label || ')', 'Child Birthday')
      ELSE COALESCE(cad.label, cad.name)
    END) AS type_label,
    "date"::timestamptz AS "timestamp",
    "date",
    "date"::timestamptz + ((extract(year from age("date")) + (CASE WHEN "date" > now() THEN 0 ELSE 1 END)) * interval '1' year) as next_occurence,
    NULL::timestamptz AS end_date,
    True AS recurring,
    (CASE
      WHEN attribute_type = 'birthday' AND ca.is_partner IS TRUE THEN
        array_to_string(ARRAY[contacts.display_name || $$'s Spouse's Birthday$$, '(' || contacts.partner_name || ')'], ' ')
      WHEN attribute_type = 'birthday' AND ca.is_partner IS NOT TRUE THEN
        contacts.display_name || $$'s Birthday$$
      WHEN attribute_type = 'child_birthday' AND ca.label IS NOT NULL AND LENGTH(ca.label) > 0 THEN
        array_to_string(ARRAY[contacts.display_name || $$'s$$, $$Child's Birthday$$, '(' || ca.label || ')'], ' ')
      WHEN attribute_type = 'child_birthday' AND (ca.label IS NULL OR LENGTH(ca.label) = 0) THEN
        contacts.display_name || $$'s Child's Birthday$$
      WHEN attribute_type = ANY('{
        work_anniversary,
        wedding_anniversary,
        home_anniversary
      }'::text[]) THEN
        contacts.display_name || $$'s $$  || cad.label
      ELSE
        contacts.display_name
    END) AS title,
    NULL::uuid AS crm_task,
    TRUE as all_day,
    NULL::uuid AS deal,
    contact,
    NULL::uuid AS campaign,
    NULL::uuid AS credential_id,
    NULL::text AS thread_key,
    NULL::uuid AS activity,
    NULL::uuid AS showing,
    NULL::uuid AS flow,
    ARRAY[contacts."user"] AS users,
    NULL::uuid[] AS accessible_to,
    ARRAY[json_build_object('id', contact, 'type', 'contact')]::json[] AS people,
    1 AS people_len,
    contacts.brand,
    NULL::text AS status,
    jsonb_build_object(
      'is_partner', is_partner
    ) AS metadata
  FROM
    contacts
    JOIN contacts_attributes_date AS ca
      ON contacts.id = ca.contact
    JOIN contacts_attribute_defs AS cad
      ON ca.attribute_def = cad.id
  WHERE
    cad.deleted_at IS NULL
    AND contacts.parked IS NOT TRUE
)
