INSERT INTO microsoft_sync_histories
  (
    "user",
    brand,
    microsoft_credential,
    synced_messages_num,
    messages_total,
    synced_contacts_num,
    contacts_total,
    sync_duration,
    status
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
RETURNING id