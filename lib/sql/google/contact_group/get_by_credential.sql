SELECT id, google_credential, meta FROM google_contact_groups WHERE google_credential = $1 AND deleted_at IS NULL