/**
 * @namespace BrandEvent
 */


const BrandEvent = {
  ...require('./get'),
  ...require('./upsert')
}


module.exports = BrandEvent