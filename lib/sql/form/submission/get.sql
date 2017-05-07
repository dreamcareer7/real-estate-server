WITH p AS
(
  SELECT DISTINCT ON (forms_submissions.id)
                     forms_submissions.id,
                     forms_data.id AS last_revision,
                     forms_data.state AS state,
                     EXTRACT(EPOCH FROM forms_submissions.created_at) AS created_at,
                     EXTRACT(EPOCH FROM forms_data.created_at) AS updated_at,
                     forms_submissions.form AS form,
                     forms_submissions.formstack_id AS formstack_id,
                     forms_data.author AS author,
                     forms_submissions.deal AS deal,
                     forms.name AS title,
                     'form_submission' AS type,
                     (SELECT file FROM files_relations WHERE role = 'SubmissionRevision' AND role_id = forms_data.id) AS file,
                     (SELECT count(*) FROM forms_data WHERE forms_data.submission = forms_submissions.id)::INT AS revision_count
  FROM forms_submissions
  JOIN forms_data
    ON forms_submissions.id = forms_data.submission
  JOIN forms
    ON forms_submissions.form = forms.id
  WHERE forms_submissions.id = ANY($1::uuid[])
  ORDER BY forms_submissions.id,
           forms_data.created_at
  DESC
)
SELECT p.*
FROM p
JOIN unnest($1::uuid[]) WITH ORDINALITY t(sid, ord) ON p.id = sid
ORDER BY t.ord
