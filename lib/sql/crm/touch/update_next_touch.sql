UPDATE
  contacts
SET
  next_touch = cl.next_touch
FROM
  get_next_touch_for_contacts($1::uuid[]) AS nt
WHERE
  nt.contact = contacts.id