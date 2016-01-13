'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE property_rooms \
ADD CONSTRAINT property_rooms_listings_fkey FOREIGN KEY(listing) \
REFERENCES public.listings (id) MATCH SIMPLE \
ON UPDATE NO ACTION ON DELETE NO ACTION;';

var sql_down = 'ALTER TABLE property_rooms DROP CONSTRAINT property_rooms_listings_fkey;';

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
