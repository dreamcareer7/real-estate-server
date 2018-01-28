const util = require('./util')
const auth = require('./authorization')
const adapter = require('./adapter')
const dbPersist = require('./db-persist')
const msgHelper = require('./msgraph-data-helper')
require('../../../scripts/connection')
require('../../../lib/utils/db')


async function authorizationDone(data) {
  try {
    const authData = await auth.authorize(data.code)
    const userInfoToBePersisted = {
      refreshToken: authData.refresh_token,
      accessToken: authData.access_token,
      expiresIn: authData.expires_in
    }
    await util.saveUserInfo(data.authInfo.user, userInfoToBePersisted)

    const contacts = await adapter.getContacts(userInfoToBePersisted.accessToken, msgHelper.contactPropsToGet)

    const convd = msgHelper.convertData(contacts.value, msgHelper.msGraphToDBMapper)
    const saveResult = await dbPersist.saveContacts(data.authInfo.user, convd)
    console.log(saveResult)
  } catch (e) {
    console.log('Error happened', e)
  }
}

module.exports = {
  redirectHandler: function (expressApp) {
    require('./web-routes')(expressApp)
      .then(authorizationDone)
  }
}