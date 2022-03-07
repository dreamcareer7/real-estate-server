const db = require('../../../utils/db')
const { encrypt } = require('../../../utils/kms')

const upsertMany = async ({ facebookCredentialId, instagramAccounts }) => {
  const instagramAccountsWithEncryptedTokens = await Promise.all(
    instagramAccounts.map(async (r) => {
      return { ...r, access_token: await encrypt(r.access_token) }
    })
  )  
  await db.selectIds('facebook/facebook_pages/upsert_many', [
    facebookCredentialId,
    JSON.stringify(instagramAccountsWithEncryptedTokens),
  ])
}

module.exports = upsertMany

