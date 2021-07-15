SELECT id FROM unread_notifications
WHERE
  deleted_at IS NULL AND
  created_at BETWEEN now() - $2::interval AND now() - $3::interval AND
  object_class = $1;
