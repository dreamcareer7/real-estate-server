const config = require('../../config').ms_graph
const util = require('./util')
const auth = require('./authorization')
const adapter = require('./adapter')
const dbAdapter = require('./db-adapter')
const msgHelper = require('./msgraph-data-helper')
const diff = require('./find-diff')
const b64url = require('base64url')

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
      accessToken: userInfoToBePersisted.accessToken,
      doneEvent: data.stateData.doneEvent
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
  Socket.send(data.doneEvent, data.userID, [], err => console.log(`Error: Sending data to socket event ${data.doneEvent} failed ==> ${err}`))
}

module.exports = {
  redirectHandler: function (expressApp) {
    require('./web-routes')(expressApp)
      .then(authorizationDone)

    expressApp.get('/authorize-ms-graph', async (req, res) => {
      let encodedState = req.query['state']
      let state
      if (encodedState) {
        state = JSON.parse(b64url.decode(encodedState))
      } else {
        const propsToGet = ['failEvent', 'user', 'doneEvent', 'authSuccessEvent', 'client']
        state = {}
        propsToGet.forEach(p => {
          state[p] = req.query[p]
        })
        encodedState = b64url(JSON.stringify(state))
      }
      const userInfo = state.user && await util.getUserInfo(state.user)
      if (!userInfo) {
        return res.redirect(config.user_login_url + '&state=' + encodedState + '&redirect_uri=' + config.redirect_url)
      }
      const decodedUserInfo = JSON.parse(userInfo)
      const accessToken = await auth.getAccessTokenByRefreshToken(decodedUserInfo.refreshToken)
      retriveAndSave({
        userID: state.user,
        accessToken: accessToken,
        doneEvent: state.doneEvent,
      })
      Socket.send(state.authSuccessEvent, state.user, [], err => console.log(`Error: Sending data to socket event ${state.authSuccessEvent} failed ==> ${err}`))
      res.redirect(config.default_auth_done_redirect_path)

    })
  }
}