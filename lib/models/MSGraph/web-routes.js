const config = require('../../config').ms_graph
const {URL} = require('url')
const MSRedirectPath = new URL(config.redirect_url)
const bodyparser = require('body-parser')
// const queue = require('../../utils/queue')

const RESPONSE_STATE_SEPERATOR = '||||'
const KEY_VALUE_SEPARATOR = '='
const DEFAULT_REDIRECT_URL = 'http://www.bing.com'

const bp = bodyparser.urlencoded({extended: true})

module.exports = function (expressApp) {
  return new Promise((resolve) => {
    expressApp.post(MSRedirectPath.pathname, bp, (req, res) => {
      const stateData = req.body.state.split(RESPONSE_STATE_SEPERATOR)
      const code = req.body.code
      const data = {}
      stateData.forEach(x => {
        const [key, value] = x.split(KEY_VALUE_SEPARATOR)
        data[key] = value
      })
      resolve({code, data})
      res.redirect(data.redirect || DEFAULT_REDIRECT_URL)
    })
  })
}