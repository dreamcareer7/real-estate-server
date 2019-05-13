INSERT INTO showings
    (
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
      $15
    )
ON CONFLICT (remote_id) DO UPDATE SET 
    agent = $1,
    mls_number = $3,
    mls_title = $4,
    date_raw = $5,
    start_date = $6,
    end_date = $7,
    remote_agent_name = $8,
    remote_agent_email = $9,
    remote_agent_desc = $10,
    remote_agent_phone = $11,
    result = $12,
    feedback_text = $13,
    cancellation_reason = $14,
    note_text = $15
RETURNING id
