SELECT COUNT(*)::INT FROM microsoft_contacts WHERE microsoft_credential = $1 AND source = ANY($2::text[])