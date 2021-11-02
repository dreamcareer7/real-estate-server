-- $1: brand_id
-- $2: event_type (attribute_type)

(
  SELECT DISTINCT
    c.id
  FROM contacts_attributes_date AS cad
  JOIN contacts AS c ON c.id = cad.contact
  WHERE
    cad.deleted_at IS NULL
    AND c.email[1] IS NOT NULL
    AND c.deleted_at IS NULL 
    AND c.brand = $1::uuid
    AND cad.attribute_type = $2::text
) EXCEPT (
  SELECT
    t.contact
  FROM triggers AS t
  WHERE
    (t.executed_at IS NULL OR t.executed_at > now() - '3 days'::interval)
    AND t.deleted_at IS NULL
    AND t.brand = $1::uuid
    AND t.action = 'schedule_email'::trigger_action
    AND t.event_type = $2::text
) EXCEPT (
  SELECT bte.contact
  FROM brand_triggers_exclusions as bte
  WHERE
    bte.brand = $1::uuid
    AND bte.event_type = $2::text
)
