const util = require('./util')
const auth = require('./authorization')
const adapter = require('./adapter')
const dbPersist = require('./db-persist')

async function authorizationDone(data) {
  try {
    const authData = await auth.authorize(data.code)
    const userInfoToBePersisted = {
      refreshToken: authData.refresh_token,
      accessToken: authData.access_token,
      expiresIn: authData.expires_in
    }
    await util.saveUserInfo(data.data.user, userInfoToBePersisted)
    const contacts = await adapter.getContacts(userInfoToBePersisted.accessToken)
    dbPersist.saveContacts(contacts)
  } catch (e) {
    console.log('Error authorizing user', e)
  }
}

module.exports = {
  redirectHandler: function (expressApp) {
    router = require('./web-routes')(expressApp)
      .then(authorizationDone)
  }
}