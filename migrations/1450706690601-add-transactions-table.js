'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'CREATE TABLE IF NOT EXISTS transactions(id uuid DEFAULT uuid_generate_v1(), room uuid NOT NULL REFERENCES rooms(id), title text, \
recommendation uuid REFERENCES recommendations(id), listing uuid REFERENCES listings(id), listing_data jsonb, \
transaction_type transaction_type NOT NULL, buyer uuid references contacts(id), seller uuid references contacts(id), \
buyer_agent uuid REFERENCES contacts(id), seller_agent uuid REFERENCES contacts(id), transaction_status listing_status NOT NULL, \
contract_price float, original_price float, sale_commission_rate float, buyer_sale_commission_split_share float, \
seller_sale_commission_split_share float, buyer_sale_commission_split float, seller_sale_commission_split float, \
broker_commission float, referral float, sale_commission_total float, earnest_money_amount float, earnest_money_held_by float, \
escrow_number text, co_buyer_agent uuid REFERENCES contacts(id), co_seller_agent uuid REFERENCES contacts(id), \
lawyer uuid REFERENCES contacts(id), lender uuid REFERENCES contacts(id), broker uuid REFERENCES contacts(id), \
team_lead uuid REFERENCES contacts(id), appraiser uuid REFERENCES contacts(id), inspector uuid REFERENCES contacts(id), \
created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW(), deleted_at timestamptz);';
var sql_down = 'DROP TABLE IF EXISTS transactions;';

var runSql = (sql) => {
  return (next) => {
    db.conn( (err, client) => {
      if(err)
        return next(err);

      return client.query(sql, next);
    });
  };
};

exports.up = runSql(sql_up);
exports.down = runSql(sql_down);
