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

// [
//   {
//     access_token: 'cGFnZSBhY2Nlc3MgdG9rZW4x',
//     name: 'page1AfterUpdate',
//     facebook_page_id: 'page1Id',
//     instagram_business_account_id: 'insta1',
//     instagram_username: 'instagram1',
//     instagram_profile_picture_url: 'http://test.com/insta.jpg'
//   },
//   {
//     access_token: 'cGFnZSBhY2Nlc3MgdG9rZW4z',
//     name: 'page4',
//     facebook_page_id: 'page4Id',
//     instagram_business_account_id: 'insta4',
//     instagram_username: 'instagram4',
//     instagram_profile_picture_url: 'http://test.com/insta4.jpg'
//   }
// ]