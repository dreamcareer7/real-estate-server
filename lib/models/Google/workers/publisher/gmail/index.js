const gmail = require('./gmail')
const notif = require('./notif')


module.exports = {
  ...gmail,
  ...notif
}