INSERT INTO forms_data
(author, form, submission, "values", formstack_response)
VALUES
($1, $2, $3, $4, $5)
RETURNING id