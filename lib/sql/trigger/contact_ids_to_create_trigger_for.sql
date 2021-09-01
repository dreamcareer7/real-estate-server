-- $1: brand_id
-- $2: event_type (attribute_type)

(
  SELECT DISTINCT
    c.id
  FROM contacts_attributes_date AS cad
  JOIN contacts AS c ON c.id = cad.contact
  WHERE
    cad.deleted_at IS NULL
    AND c.primary_email IS NOT NULL
    AND c.deleted_at IS NULL 
    AND c.brand = $1::uuid
    AND cad.attribute_type = $2::text
) EXCEPT (
  SELECT
    t.contact
  FROM triggers AS t
  WHERE
    COALESCE(t.executed_at > now() - '3d'::interval, TRUE)
    AND t.deleted_at IS NULL
    AND t.brand = $1::uuid
    AND t.action = 'schedule_email'
    AND t.event_type = $2::uuid
)
