CREATE OR REPLACE FUNCTION get_contact_touch_freqs(contact_ids uuid[])
RETURNS TABLE (
  id uuid,
  touch_freq integer
)
STABLE LANGUAGE SQL AS $$
  SELECT id, touch_freq FROM contacts where id = ANY(contact_ids)
$$
