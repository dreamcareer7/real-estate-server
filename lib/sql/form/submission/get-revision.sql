SELECT
  forms_data.id AS id,
  forms_submissions.id AS submission,
  EXTRACT(EPOCH FROM forms_submissions.created_at) AS created_at,
  EXTRACT(EPOCH FROM forms_data.created_at) AS updated_at,
  forms_submissions.form AS form,
  forms_data.author AS author,
  forms_submissions.deal AS deal,
  forms_data.values AS "values",
  'form_revision' AS type
FROM forms_data
JOIN forms_submissions ON forms_submissions.id = forms_data.submission
WHERE forms_data.id = $1