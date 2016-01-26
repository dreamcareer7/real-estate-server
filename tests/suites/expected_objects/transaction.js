var user = require('./user.js');
var contact = require('./contact.js');
var recommendation = require('./recommendation.js');
var listing = require('./listing.js');
var v = require('../../../lib/utils/response_validation.js');

module.exports = {
  id: String,
  title: v.optionalString,
  title: v.optionalString,
  recommendation: function(val) { expect(val).toBeTypeOrNull(recommendation); },
  listing: function(val) { expect(val).toBeTypeOrNull(listing); },
  listing_data: Object,
  transaction_type: v.optionalString,
  transaction_status: v.optionalString,
  contract_price: v.optionalNumber,
  original_price: v.optionalNumber,
  sale_commission_rate: v.optionalNumber,
  buyer_sale_commission_split_share: v.optionalNumber,
  seller_sale_commission_split_share: v.optionalNumber,
  buyer_sale_commission_split: v.optionalNumber,
  seller_sale_commission_split: v.optionalNumber,
  broker_commission: v.optionalNumber,
  referral: v.optionalNumber,
  sale_commission_total: v.optionalNumber,
  earnest_money_amount: v.optionalNumber,
  earnest_money_held_by: v.optionalNumber,
  escrow_number: v.optionalString,
  created_at: v.optionalNumber,
  updated_at: v.optionalNumber,
  deleted_at: v.optionalNumber,
  roles: v.optionalArray,
  important_dates: v.optionalArray,
  attachments: v.optionalArray,
  tasks: v.optionalArray
}