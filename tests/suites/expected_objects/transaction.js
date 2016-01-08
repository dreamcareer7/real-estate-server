var user = require('./user.js');
var contact = require('./contact.js');
var recommendation = require('./recommendation.js');
var listing = require('./listing.js');

module.exports = {
  id: String,
  title: function(val) { expect(val).toBeTypeOrNull(String); },
  title: function(val) { expect(val).toBeTypeOrNull(String); },
  recommendation: function(val) { expect(val).toBeTypeOrNull(recommendation); },
  listing: function(val) { expect(val).toBeTypeOrNull(listing); },
  listing_data: {},
  transaction_type: function(val) { expect(val).toBeTypeOrNull(String); },
  transaction_status: function(val) { expect(val).toBeTypeOrNull(String); },
  contract_price: function(val) { expect(val).toBeTypeOrNull(Number); },
  original_price: function(val) { expect(val).toBeTypeOrNull(Number); },
  sale_commission_rate: function(val) { expect(val).toBeTypeOrNull(Number); },
  buyer_sale_commission_split_share: function(val) { expect(val).toBeTypeOrNull(Number); },
  seller_sale_commission_split_share: function(val) { expect(val).toBeTypeOrNull(Number); },
  buyer_sale_commission_split: function(val) { expect(val).toBeTypeOrNull(Number); },
  seller_sale_commission_split: function(val) { expect(val).toBeTypeOrNull(Number); },
  broker_commission: function(val) { expect(val).toBeTypeOrNull(Number); },
  referral: function(val) { expect(val).toBeTypeOrNull(Number); },
  sale_commission_total: function(val) { expect(val).toBeTypeOrNull(Number); },
  earnest_money_amount: function(val) { expect(val).toBeTypeOrNull(Number); },
  earnest_money_held_by: function(val) { expect(val).toBeTypeOrNull(Number); },
  escrow_number: function(val) { expect(val).toBeTypeOrNull(String); },
  created_at: function(val) { expect(val).toBeTypeOrNull(Number); },
  updated_at: function(val) { expect(val).toBeTypeOrNull(Number); },
  deleted_at: function(val) { expect(val).toBeTypeOrNull(Number); },
  contacts: function(val) { expect(val).toBeTypeOrNull(Array); },
  important_dates: function(val) { expect(val).toBeTypeOrNull(Array); }
}