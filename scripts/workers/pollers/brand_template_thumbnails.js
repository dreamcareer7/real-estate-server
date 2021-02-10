const BrandTemplate = require('../../../lib/models/Template/brand')
const { poll } = require('../utils/poll')

function start() {
  poll({
    fn: BrandTemplate.updateThumbnails,
    name: 'BrandTemplate.updateThumbnails'
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
