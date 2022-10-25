WITH cdeals AS (
  SELECT
    *
  FROM
    get_deals_with_contacts($2::uuid, $1::uuid[])
  WHERE
    $3::text[] @> ARRAY['contact.deals']
), clists AS (
  SELECT
    contact,
    array_agg(list) as lists
  FROM
    crm_lists_members
    JOIN crm_lists
      ON crm_lists.id = list
  WHERE
    crm_lists.deleted_at IS NULL
    AND crm_lists_members.deleted_at IS NULL
    AND contact = ANY($1::uuid[])
    AND $3::text[] @> ARRAY['contact.lists']
  GROUP BY
    contact
)
SELECT
  id,
  display_name,
  partner_name,
  brand,
  "user",
  sort_field,
  extract(epoch FROM last_touch) AS last_touch,
  last_touch_action,
  extract(epoch FROM next_touch) AS next_touch,
  touch_freq,
  id AS summary,
  ios_address_book_id,
  android_address_book_id,
  extract(epoch FROM created_at) as created_at,
  extract(epoch FROM updated_at) as updated_at,
  extract(epoch FROM deleted_at) as deleted_at,
  created_by,
  updated_by,
  created_for,
  updated_for,
  deleted_for,

  title,
  first_name,
  partner_first_name,
  middle_name,
  last_name,
  partner_last_name,
  marketing_name,
  nickname,
  email[1] AS email,
  email[1] AS primary_email,
  email AS emails,
  parked,
  partner_email,
  phone_number[1] AS phone_number,
  phone_number[1] AS primary_phone_number,
  phone_number AS phone_numbers,
  company,
  birthday,
  profile_image_url,
  cover_image_url,
  job_title,
  source_type,
  source,
  website AS website,
  tag AS tags,
  (SELECT json_agg(STDADDR_TO_JSON(unnest)) FROM unnest("address"::stdaddr[])) AS "address",

  (SELECT
    array_agg(contacts_attributes.id ORDER BY created_at)
  FROM
    contacts_attributes
  WHERE
    contacts_attributes.contact = contacts.id
    AND contacts_attributes.deleted_at IS NULL
    AND $3::text[] @> ARRAY['contact.attributes']
  ) as attributes,
  (
    SELECT
      lists
    FROM
      clists
    WHERE
      contact = id
  ) AS lists,
  (
    SELECT
      array_agg(flows.id)
    FROM
      flows
    WHERE
      flows.deleted_at IS NULL
      AND flows.contact = contacts.id
      AND $3::text[] @> ARRAY['contact.flows']
  ) as flows,
  (
    SELECT
      array_agg(t.id)
    FROM
      (
        SELECT DISTINCT ON (event_type)
          id
        FROM
          triggers
        WHERE
          deleted_at IS NULL
          AND (executed_at IS NULL OR (executed_at > NOW() - interval '3 days'))
          AND contact = contacts.id
          AND $3::text[] @> ARRAY['contact.triggers']
        ORDER BY
          event_type, executed_at
      ) AS t
    WHERE
      $3::text[] @> ARRAY['contact.triggers']
  ) as triggers,
  (
    SELECT
      array_agg("user")
    FROM
      contacts_users
    WHERE
      contact = id
      AND $3::text[] @> ARRAY['contact.users']
  ) as users,
  (
    SELECT
      array_agg(deal)
    FROM
      cdeals
    WHERE
      contact = id
  ) as deals,
  (
    SELECT
      array_agg(cr.id)
    FROM
      contacts_roles AS cr
    WHERE
      'contact.assignees' = ANY($3::text[]) AND
      cr.deleted_at IS NULL AND
      cr.contact = contacts.id AND
      cr.role = 'assignee'
  ) AS assignees,
  'contact' as type,
  lead_channel
FROM
  contacts
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON contacts.id = t.cid
ORDER BY
  t.ord
