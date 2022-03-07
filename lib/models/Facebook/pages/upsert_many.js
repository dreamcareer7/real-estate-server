const db = require('../../../utils/db')

const upsertMany = async ({ facebookCredentialId, instagramAccounts }) => {
  await db.selectIds('facebook/facebook_pages/upsert_many', [
    facebookCredentialId,
    JSON.stringify(instagramAccounts),
  ])
}

module.exports = upsertMany
