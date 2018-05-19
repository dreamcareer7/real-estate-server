const config = require('../../config').ms_graph
const util = require('./util')
const auth = require('./authorization')
const adapter = require('./adapter')
const dbAdapter = require('./db-adapter')
const msgHelper = require('./msgraph-data-helper')
const diff = require('./find-diff')
const b64url = require('base64url')
const {URL} = require('url')
const bodyparser = require('body-parser')
const bp = bodyparser.urlencoded({extended: true})
const arrApply = require('../../utils/partial-array-application').apply
const fixHeroku = require('../../utils/fix-heroku')
const waitingCharToSend = '\f'

// We only need the path part so we should parse it
const MSRedirectPath = new URL(config.redirect_url)

async function authorizationDone(data) {
  try {
    const authData = await auth.authorize(data.code)
    const userInfoToBePersisted = {
      refreshToken: authData.refresh_token,
      accessToken: authData.access_token,
      expiresIn: authData.expires_in
    }
    // Following line saves user info in redis, so it can be used later, but commented for now to prevent unwanted bugs that occur and needs cleaning refresh token
    // await util.saveUserInfo(data.stateData.user, userInfoToBePersisted)
    await retrieveAndSave({
      userID: data.stateData.user,
      accessToken: userInfoToBePersisted.accessToken
    })
    
  } catch (e) {
    console.log('Error happened', e)
  }
}

async function retrieveAndSave(data) {
  // Get all contacts from MS Graph
  const graphContacts = await adapter.getAllContacts(data.accessToken, msgHelper.contactPropsToGet)
  
  // Convert Graph contacts to a suitable format for saving in DB
  const graphContactsConverted = await msgHelper.convertData(graphContacts.value, msgHelper.msGraphToDBMapper, data.userID)
  
  // Get current Graph contacts from DB
  const currentGraphContacts = await dbAdapter.getCurrentMSGraphContacts(data.userID)
  
  // Compare for changes between current Graph contatcs on DB and newly fetched contacts from MS Graph
  const {totallyNew, addAttribute} = await diff.compareAll(currentGraphContacts, graphContactsConverted)
  
  await arrApply(totallyNew, d => dbAdapter.saveContacts(data.userID, d), 1000)
  console.log('Saving new Outlook contact done')
  await dbAdapter.addAttributeToContactForUser(data.userID, addAttribute)
  console.log('Adding new / Updating current attributes for Outlook contacts done')
}

module.exports = {
  redirectHandler: function (expressApp) {
    
    expressApp.post(MSRedirectPath.pathname, bp, async (req, res) => {
      const stateData = JSON.parse(b64url.decode(req.body.state))
      const code = req.body.code
      const end = fixHeroku(req, waitingCharToSend)
      Socket.send(stateData.authSuccessEvent, stateData.user, [], err => err && console.error(`Error: Sending data to socket event ${stateData.authSuccessEvent} failed ==> ${err}`))
      await authorizationDone({code, stateData})
      end()
      res.end('All done. Please close this window.')
      Socket.send(stateData.doneEvent, stateData.user, [], err => err && console.error(`Error: Sending data to socket event ${stateData.doneEvent} failed ==> ${err}`))
    })
    
    
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
      
      return res.redirect(config.user_login_url + '&state=' + encodedState + '&redirect_uri=' + config.redirect_url + '&client_id=' + config.client_id)
      
      // The code below, is used if we want to cache user info on redis
      
      // const userInfo = state.user && await util.getUserInfo(state.user)
      // if (!userInfo) {
      //   return res.redirect(config.user_login_url + '&state=' + encodedState + '&redirect_uri=' + config.redirect_url + '&client_id=' + config.client_id)
      // }
      // const decodedUserInfo = JSON.parse(userInfo)
      // let accessToken
      // try {
      //   accessToken = await auth.getAccessTokenByRefreshToken(decodedUserInfo.refreshToken)
      // } catch (e) {
      //   if (e.error_codes && e.error_codes.includes(70000)) {
      //     console.log('Refresh token is expired redirecting to MS login, user:', state.user)
      //   } else {
      //     console.log('Authorizing MS Graph: error accessing data saved for user %s, error: %o redirecting', state.user, e)
      //   }
      //   util.removeUserInfo(state.user)
      //   return res.redirect(config.user_login_url + '&state=' + encodedState + '&redirect_uri=' + config.redirect_url + '&client_id=' + config.client_id)
      // }
      // Socket.send(state.authSuccessEvent, state.user, [], err => err && console.error(`Error: Sending data to socket event ${state.authSuccessEvent} failed ==> ${err}`))
      // const end = fixHeroku(req, waitingCharToSend)
      // accessToken && await retrieveAndSave({
      //   userID: state.user,
      //   accessToken: accessToken,
      //   doneEvent: state.doneEvent,
      // })
      // end()
      // res.end('All done. Please close this window.')
      // Socket.send(state.doneEvent, state.user, [], err => err && console.error(`Error: Sending data to socket event ${state.doneEvent} failed ==> ${err}`))
    })
  }
}