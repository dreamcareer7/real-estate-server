const gmail   = require('./gmail')
const notif   = require('./notif')
const byQuery = require('./byQuery')


module.exports = {
  ...gmail,
  ...notif,
  ...byQuery,
}