CREATE OR REPLACE FUNCTION get_last_touch_for_contacts(uuid[])
RETURNS TABLE (
  contact uuid,
  last_touch timestamptz
)
LANGUAGE SQL
AS $$
  SELECT DISTINCT ON (ca.contact)
    ca.contact,
    crm_tasks.due_date AS last_touch
  FROM
    crm_tasks
    JOIN crm_associations AS ca
      ON ca.crm_task = crm_tasks.id
  WHERE
    ca.contact = ANY($1)
    AND crm_tasks.status = 'DONE'
  ORDER BY
    ca.contact, crm_tasks.due_date desc
$$