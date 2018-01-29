const util = require('./util')
const auth = require('./authorization')
const adapter = require('./adapter')
const dbAdapter = require('./db-adapter')
const msgHelper = require('./msgraph-data-helper')
const diff = require('./find-diff')
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
    await util.saveUserInfo(data.stateData.user, userInfoToBePersisted)

    const graphContacts = await adapter.getContacts(userInfoToBePersisted.accessToken, msgHelper.contactPropsToGet)
    const graphContactsConverted = msgHelper.convertData(graphContacts.value, msgHelper.msGraphToDBMapper)

    const currentGraphContacts = await dbAdapter.getCurrentMSGraphContacts(data.stateData.user)
    const {totallyNew, changed, addAttribute} = diff.compareAll(currentGraphContacts, graphContactsConverted)
    // TODO-JAVAD: There should be a way to do these in parallel and avoid any race conditions etc. if any
    await dbAdapter.saveContacts(data.stateData.user, totallyNew)
    await dbAdapter.updateContactForUser(data.stateData.user, changed)
    await dbAdapter.addAttributeToContactForUser(data.stateData.user, addAttribute)

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