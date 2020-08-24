/**
 * @namespace BrandFlow
 */


const BrandFlow = {
  ...require('./get'),
  ...require('./upsert')
}


module.exports = BrandFlow