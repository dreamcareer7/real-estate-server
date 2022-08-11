WITH credentials AS (
  UPDATE microsoft_credentials SET cfolders_sync_token = null, contacts_sync_token = null WHERE id = $1::UUID
),

folders AS (
  UPDATE microsoft_contact_folders SET sync_token = null WHERE microsoft_credential = $1::UUID
)

UPDATE users_jobs SET start_at = null, deleted_at = null, status = 'waiting', resume_at = null WHERE job_name = 'contacts' AND microsoft_credential = $1::UUID