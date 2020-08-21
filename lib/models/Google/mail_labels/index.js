/**
 * @namespace GoogleMailLabel
 */

const GoogleMailLabel = {
  ...require('./get'),
  ...require('./upsert')
}


module.exports = GoogleMailLabel