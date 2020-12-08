const contacts = require('./contacts')
const avatars  = require('./avatars')


module.exports = {
  ...contacts,
  ...avatars
}