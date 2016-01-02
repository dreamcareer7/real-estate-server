'use strict';

var async = require('async');
var db = require('../lib/utils/db');

var up = ['CREATE TABLE public.offices(\
  id uuid DEFAULT uuid_generate_v1(),\
  board text,\
  email text,\
  fax text,\
  office_mui integer,\
  office_mls_id text,\
  licence_number text,\
  address text,\
  care_of text,\
  city text,\
  postal_code text,\
  postal_code_plus4 text,\
  state text,\
  matrix_unique_id integer NOT NULL,\
  matrix_modified_dt timestamp with time zone,\
  mls text,\
  mls_id text,\
  mls_provider text,\
  nar_number text,\
  contact_mui text,\
  contact_mls_id text,\
  long_name text,\
  name text,\
  status listing_status,\
  phone text,\
  other_phone text,\
  st_address text,\
  st_city text,\
  st_country text,\
  st_postal_code text,\
  st_postal_code_plus4 text,\
  st_state text,\
  url text,\
  created_at timestamp with time zone DEFAULT now())'];

var down = ['DROP TABLE IF EXISTS offices;'];

var runAll = (sqls, next) => {
  db.conn( (err, client) => {
    if(err)
      return next(err);

    async.eachSeries(sqls, client.query.bind(client), next);
  });
};

var run = (queries) => {
  return (next) => {
    runAll(queries, next);
  };
};

exports.up = run(up);
exports.down = run(down);
