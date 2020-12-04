const outlook = require('./outlook')
const notif   = require('./notif')
const byQuery = require('./byQuery')

module.exports = {
  ...outlook,
  ...notif,
  ...byQuery
}