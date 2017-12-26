SELECT envelopes_recipients.*,
       'envelope_recipient' AS type,
       EXTRACT(EPOCH FROM envelopes_recipients.created_at) AS created_at,
       EXTRACT(EPOCH FROM envelopes_recipients.updated_at) AS updated_at
FROM envelopes_recipients
JOIN deals_roles ON envelopes_recipients.role = deals_roles.id
JOIN users ON deals_roles.user = users.id
WHERE envelopes_recipients.envelope = $1 AND
      users.id = $2
