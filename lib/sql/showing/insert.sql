INSERT INTO showings
    (
        crm_task,
        agent,
        remote_id,
        mls_number,
        mls_title,
        date_raw,
        start_date,
        end_date,
        remote_agent_name,
        remote_agent_email,
        remote_agent_desc,
        remote_agent_phone,
        result,
        feedback_text,
        cancellation_reason,
        note_text
    )
VALUES
    (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13,
      $14,
      $15,
      $16
    )
ON CONFLICT (remote_id) DO UPDATE SET 
    crm_task = $1,
    agent = $2,
    remote_id = $3,
    mls_number = $4,
    mls_title = $5,
    date_raw = $6,
    start_date = $7,
    end_date = $8,
    remote_agent_name = $9,
    remote_agent_email = $10,
    remote_agent_desc = $11,
    remote_agent_phone = $12,
    result = $13,
    feedback_text = $14,
    cancellation_reason = $15,
    note_text = $16
RETURNING id
