INSERT INTO forms_data
(author, form, submission, state, "values", formstack_response)
VALUES
($1, $2, $3, $4, $5, $6)
RETURNING id