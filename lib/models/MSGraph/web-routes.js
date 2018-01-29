const config = require('../../config').ms_graph
const {URL} = require('url')
const bodyparser = require('body-parser')
const b64url = require('base64url')

// Just for testing this should be replaced with real one
// TODO-Javad: Fix this and replace with real default redirect url
const DEFAULT_REDIRECT_URL = 'http://www.bing.com'

const bp = bodyparser.urlencoded({extended: true})

module.exports = function (expressApp) {
  const MSRedirectPath = new URL(config.redirect_url)

  expressApp.get('/authorize-ms-graph', bp, (req, res) => {
    const state = req.query['state']
    res.redirect(config.user_login_url + '&state=' + state)
  })

  return new Promise((resolve) => {
    expressApp.post(MSRedirectPath.pathname, bp, (req, res) => {
      const stateData = JSON.parse(b64url.decode(req.body.state))
      const code = req.body.code
      resolve({code, stateData})
      res.redirect(stateData.redirectURL || DEFAULT_REDIRECT_URL)
    })
  })
}
