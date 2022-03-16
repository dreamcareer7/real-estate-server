const SocialPost = require('../../../lib/models/SocialPost/due')
const { poll } = require('../utils/poll')

function start() {
  poll({
    fn: SocialPost.sendDue,
    name: 'SocialPost.sendDue',
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
