const config = require('../../config').ms_graph
const util = require('./util')
const auth = require('./authorization')
const adapter = require('./adapter')
const dbAdapter = require('./db-adapter')
const msgHelper = require('./msgraph-data-helper')
const diff = require('./find-diff')
const b64url = require('base64url')
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
    retriveAndSave({
      userID: data.stateData.user,
      accessToken: userInfoToBePersisted.accessToken
    })
  } catch (e) {
    console.log('Error happened', e)
  }
}

async function retriveAndSave(data) {
  const graphContacts = await adapter.getContacts(data.accessToken, msgHelper.contactPropsToGet)
  const graphContactsConverted = msgHelper.convertData(graphContacts.value, msgHelper.msGraphToDBMapper)

  const currentGraphContacts = await dbAdapter.getCurrentMSGraphContacts(data.userID)
  const {totallyNew, changed, addAttribute} = diff.compareAll(currentGraphContacts, graphContactsConverted)
  // TODO-JAVAD: There should be a way to do these in parallel and avoid any race conditions etc. if any
  await dbAdapter.saveContacts(data.userID, totallyNew)
  await dbAdapter.updateContactForUser(data.userID, changed)
  await dbAdapter.addAttributeToContactForUser(data.userID, addAttribute)
}

module.exports = {
  redirectHandler: function (expressApp) {
    require('./web-routes')(expressApp)
      .then(authorizationDone)

    expressApp.get('/authorize-ms-graph', async (req, res) => {
      const encodedState = req.query['state']
      const state = JSON.parse(b64url.decode(encodedState))
      const userInfo = state.user && await util.getUserInfo(state.user)
      if (!userInfo) {
        return res.redirect(config.user_login_url + '&state=' + encodedState + '&redirect_uri=' + config.redirect_url)
      }
      const decodedUserInfo = JSON.parse(userInfo)
      retriveAndSave({
        userID: state.user,
        accessToken: decodedUserInfo.accessToken
      })
      res.redirect(state.redirectURL || config.default_auth_done_redirect_url)

    })
  }
}