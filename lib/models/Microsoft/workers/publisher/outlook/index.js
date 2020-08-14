const outlook = require('./outlook')
const notif   = require('./notif')


module.exports = {
  ...outlook,
  ...notif
}