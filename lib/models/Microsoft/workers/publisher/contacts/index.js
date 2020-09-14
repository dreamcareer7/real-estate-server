const contacts = require('./contacts')
const notif    = require('./notif')


module.exports = {
  ...contacts,
  ...notif
}