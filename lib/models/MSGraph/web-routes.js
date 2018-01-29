const config = require('../../config').ms_graph
const {URL} = require('url')
const bodyparser = require('body-parser')
const b64url = require('base64url')

const bp = bodyparser.urlencoded({extended: true})

module.exports = function (expressApp) {
  // We only need the path part so we should parse it
  const MSRedirectPath = new URL(config.redirect_url)

  expressApp.get(config.default_auth_done_redirect_path, (req, res) => {
    res.send('All done. Please close this window and be patient while we retrieve your contacts.')
  })

  // expressApp.get('/authorize-ms-graph', (req, res) => {
  //   const state = req.query['state']
  //   res.redirect(config.user_login_url + '&state=' + state)
  // })

  return new Promise((resolve) => {
    expressApp.post(MSRedirectPath.pathname, bp, (req, res) => {
      const stateData = JSON.parse(b64url.decode(req.body.state))
      const code = req.body.code
      resolve({code, stateData})
      res.redirect(stateData.redirectURL || config.default_auth_done_redirect_path)
    })
  })
}
