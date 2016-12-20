INSERT INTO forms_submissions
(deal, form, formstack_id) VALUES ($1, $2, $3)
RETURNING id