const v = require('./validation.js')
const listing = require('./listing.js')

module.exports = {
  'id':              String,
  'user':            String,
  'room':            String,
  'suggested_price': Number,
  'comment':         String,
  'listings':        v.optionalStringArray,
  'created_at':      Number,
  'updated_at':      Number,
  'deleted_at':      v.optionalNumber,
  'lowest_price':    Number,
  'average_price':   Number,
  'highest_price':   Number,
  'lowest_dom':      Number,
  'average_dom':     Number,
  'highest_dom':     Number,
  'main_listing':    listing,
  'type':            'cma'
}
