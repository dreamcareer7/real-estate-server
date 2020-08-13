const calendar = require('./calendar')
const notif    = require('./notif')


module.exports = {
  ...calendar,
  ...notif
}