'use strict'

const db = require('../lib/utils/db')

const sql_up = 'CREATE TABLE IF NOT EXISTS transactions(id uuid DEFAULT uuid_generate_v1() PRIMARY KEY, \
"user" uuid NOT NULL REFERENCES users(id), title text, \
recommendation uuid REFERENCES recommendations(id), listing uuid REFERENCES listings(id), listing_data jsonb, \
transaction_type transaction_type NOT NULL, transaction_status listing_status NOT NULL, \
contract_price float, original_price float, sale_commission_rate float, buyer_sale_commission_split_share float, \
seller_sale_commission_split_share float, buyer_sale_commission_split float, seller_sale_commission_split float, \
broker_commission float, referral float, sale_commission_total float, earnest_money_amount float, earnest_money_held_by float, \
escrow_number text, created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW(), deleted_at timestamptz);'
const sql_down = 'DROP TABLE IF EXISTS transactions;'

const runSql = (sql) => {
  return (next) => {
    db.conn((err, client) => {
      if (err)
        return next(err)

      return client.query(sql, next)
    })
  }
}

exports.up = runSql(sql_up)
exports.down = runSql(sql_down)
