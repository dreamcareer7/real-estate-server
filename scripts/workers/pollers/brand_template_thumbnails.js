const BrandTemplate = require('../../../lib/models/Template/brand')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: BrandTemplate.updateThumbnails,
  name: 'BrandTemplate.updateThumbnails'
})
