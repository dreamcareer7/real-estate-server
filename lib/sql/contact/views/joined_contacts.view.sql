CREATE OR REPLACE VIEW joined_contacts AS (
  SELECT
    c1.id AS c1_id, c1.parent AS c1_parent,
    c2.id AS c2_id, c2.parent AS c2_parent
  FROM
    contacts c1,
    contacts c2
  WHERE
    coalesce(c2.parent, c2.id) = coalesce(c1.parent, c1.id)
    AND c1.deleted_at IS NULL
    AND c2.deleted_at IS NULL
)