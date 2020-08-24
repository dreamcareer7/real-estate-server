const GoogleCredential = require('../credential')
const gmailPublisher   = require('./publisher/gmail/gmail')


const handleWebhooks = async (data) => {
  const result      = await GoogleCredential.getByEmail(data.key)
  const credentials = result.filter(c => (c.scope_summary && c.scope_summary.includes('mail.read') && !c.revoked && !c.deleted_at))

  for (const credential of credentials) {
    try {

      /*
        If we use this method, It will end up to a loop of fetching and scheduling sync jobs, we must pass directly the current job to the target/relevant queue.
        await UsersJob.forceSyncByGoogleCredential(credential.id, 'gmail')
      */

      const payload = {
        action: 'sync_gmail',
        cid: credential.id,
        immediate: true
      }

      gmailPublisher.syncGmail(payload)

    } catch (ex) {
      // do nothing
    }
  }

  return
}


module.exports = {
  handleWebhooks
}