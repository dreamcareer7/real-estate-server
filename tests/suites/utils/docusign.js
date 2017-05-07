const webdriverio = require('webdriverio')
const deasync = require('deasync')
const config = require('../../../lib/config')

const run = ({url, username, password}, cb) => {
  const client = webdriverio.remote(config.selenium).init()

  return client
    .url(url)
    .setValue('input#username', username)
    .click('form button')
    .waitForExist('input#password')
    .setValue('input#password', password)
    .click('form button')
    .waitForExist('form[name=login]', 15000, true)
    .getUrl()
    .then(url => {
      cb(null, url)
    })
    .catch( cb )
    .end()
}


module.exports = deasync(run)
