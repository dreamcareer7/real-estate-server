CREATE OR REPLACE FUNCTION get_contact_touch_freqs(contact_ids uuid[])
RETURNS TABLE (
  id uuid,
  touch_freq integer
)
STABLE
LANGUAGE SQL AS $$
  (
    SELECT
      cids.id,
      touch_freq
    FROM
      unnest($1::uuid[]) AS cids(id)
      JOIN crm_lists_members AS clm
        ON cids.id = clm.contact
      JOIN crm_lists AS csl
        ON csl.id = clm.list
    WHERE
      touch_freq IS NOT NULL
      AND clm.deleted_at IS NULL
      AND csl.deleted_at IS NULL
  ) UNION ALL (
    SELECT
      cids.id,
      touch_freq
    FROM
      unnest($1::uuid[]) AS cids(id)
      JOIN contacts AS c
        ON cids.id = c.id
      CROSS JOIN LATERAL unnest(c.tag) AS t(tag)
      LEFT JOIN crm_tags AS ct
        ON (ct.tag = t.tag)
    WHERE
      touch_freq IS NOT NULL
      AND ct.brand = c.brand
      AND ct.deleted_at IS NULL
  )
$$
