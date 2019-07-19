INSERT INTO envelopes_documents
(envelope, title, document_id, task, submission_revision, file) VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *
