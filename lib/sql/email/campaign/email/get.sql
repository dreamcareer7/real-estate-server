SELECT email_campaign_emails.*,
  'email_campaign_email' AS TYPE,
  contacts_summaries.display_name,
  contacts_summaries.profile_image_url

FROM email_campaign_emails
LEFT JOIN  contacts_summaries ON email_campaign_emails.contact = contacts_summaries.id
JOIN unnest($1::uuid[]) WITH ORDINALITY t(eid, ord) ON email_campaign_emails.id = eid
ORDER BY t.ord
