INSERT INTO microsoft_calendars
  (
    microsoft_credential,
    calendar_id,
    name,
    color,
    change_key,
    can_share,
    can_view_private_items,
    can_edit,
    origin
  )
VALUES
  (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9
  )
ON CONFLICT (microsoft_credential, calendar_id) DO UPDATE SET
  name = $3,
  color = $4,
  change_key = $5,
  can_share = $6,
  can_view_private_items = $7,
  can_edit = $8,
  origin = $9,
  updated_at = now()
RETURNING id