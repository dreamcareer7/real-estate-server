'use strict';

var db = require('../lib/utils/db');

var sql_up   = 'ALTER TABLE users \
ADD CONSTRAINT users_agents_agent_fkey FOREIGN KEY(agent) \
REFERENCES public.agents (id) MATCH SIMPLE \
ON UPDATE NO ACTION ON DELETE NO ACTION;';

var sql_down = 'ALTER TABLE users DROP CONSTRAINT users_agents_agent_fkey;';

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
