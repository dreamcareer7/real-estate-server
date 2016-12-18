INSERT INTO forms_submissions
(form, formstack_id) VALUES ($1, $2)
RETURNING id