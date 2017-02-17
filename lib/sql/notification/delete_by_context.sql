UPDATE notifications
SET
  deleted_at = CLOCK_TIMESTAMP()
WHERE
  (
    object_class = $1 AND
    object = $2
  ) OR
  (
    subject_class = $1 AND
    subject = $2
  ) OR
  (
    auxiliary_object_class = $1 AND
    auxiliary_object = $2
  ) OR
  (
    auxiliary_subject_class = $1 AND
    auxiliary_subject = $2
  )
