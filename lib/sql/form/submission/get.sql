SELECT
  forms_submissions.id AS id,
  EXTRACT(EPOCH FROM forms_submissions.created_at) AS created_at,
  EXTRACT(EPOCH FROM forms_data.created_at) AS updated_at,
  forms_submissions.form AS form,
  forms_submissions.formstack_id AS formstack_id,
  forms_data.author AS author,
  forms_data.values AS "values"
FROM forms_submissions
JOIN forms_data ON forms_submissions.id = forms_data.submission
WHERE forms_submissions.id = $1
ORDER BY forms_data.created_at DESC LIMIT 1