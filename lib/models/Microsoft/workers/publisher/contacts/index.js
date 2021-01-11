const contacts = require('./contacts')
const avatars  = require('./avatars')
const notif    = require('./notif')


module.exports = {
  ...contacts,
  ...avatars,
  ...notif
}