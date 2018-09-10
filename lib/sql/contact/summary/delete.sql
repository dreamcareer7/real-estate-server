DELETE FROM contacts_summaries WHERE id = ANY($1::uuid[]);
