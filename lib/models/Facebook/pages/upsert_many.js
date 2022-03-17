const db = require('../../../utils/db')
const { encrypt } = require('../../../utils/kms')

const upsertMany = async ({ facebookCredentialId, instagramAccounts }) => {
  const instagramAccountsWithEncryptedTokens = await Promise.all(    
    instagramAccounts.map(async (r) => {
      return { ...r, access_token: await encrypt(Buffer.from(r.access_token, 'utf-8')) }
    })
  )  
  await db.selectIds('facebook/facebook_pages/upsert_many', [
    facebookCredentialId,
    JSON.stringify(instagramAccountsWithEncryptedTokens),
  ])
}

module.exports = upsertMany

