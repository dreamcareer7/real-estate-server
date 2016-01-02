var db = require('../utils/db.js');
var validator = require('../utils/validator.js');
var sql_insert = require('../sql/office/insert.sql');
var sql_update = require('../sql/office/update.sql');
var sql_get_mui = require('../sql/office/get_mui.sql');

Office = {};

var schema = {
  type: 'object',
  properties: {
    board: {
      type: 'string'
    },
    email: {
      type: 'string'
    },
    fax: {
      type: 'string'
    },
    office_mui: {
      type: 'number'
    },
    office_mls_id: {
      type: 'string'
    },
    licence_number: {
      type: 'string'
    },
    address: {
      type: 'string'
    },
    care_of: {
      type: 'string'
    },
    city: {
      type: 'string'
    },
    postal_code: {
      type: 'string'
    },
    postal_code_plus4: {
      type: 'string'
    },
    state: {
      type: 'string'
    },
    matrix_unique_id: {
      type: 'number',
      required: true
    },
    matrix_modified_dt: {
      type: 'string'
    },
    mls: {
      type: 'string'
    },
    mls_id: {
      type: 'string'
    },
    mls_provider: {
      type: 'string'
    },
    nar_number: {
      type: 'string'
    },
    contact_mui: {
      type: 'string'
    },
    contact_mls_id: {
      type: 'string'
    },
    long_name: {
      type: 'string'
    },
    name: {
      type: 'string'
    },
    status: {
      type: 'string'
    },
    phone: {
      type: 'string'
    },
    other_phone: {
      type: 'string'
    },
    st_address: {
      type: 'string'
    },
    st_city: {
      type: 'string'
    },
    st_country: {
      type: 'string'
    },
    st_postal_code: {
      type: 'string'
    },
    st_postal_code_plus4: {
      type: 'string'
    },
    st_state: {
      type: 'string'
    },
    url: {
      type: 'string'
    }
  }
};

var validate = validator.bind(null, schema);

Office.create = function (office, cb) {
  validate(office, function (err) {
    if (err)
      return cb(err);
    db.query(sql_insert, [
      office.board,
      office.email,
      office.fax,
      office.office_mui,
      office.office_mls_id,
      office.licence_number,
      office.address,
      office.care_of,
      office.city,
      office.postal_code,
      office.postal_code_plus4,
      office.state,
      office.matrix_unique_id,
      office.matrix_modified_dt,
      office.mls,
      office.mls_id,
      office.mls_provider,
      office.nar_number,
      office.contact_mui,
      office.contact_mls_id,
      office.long_name,
      office.name,
      office.status,
      office.phone,
      office.other_phone,
      office.st_address,
      office.st_city,
      office.st_country,
      office.st_postal_code,
      office.st_postal_code_plus4,
      office.st_state,
      office.url
    ], cb);
  });
};

Office.update = function (id, office, cb) {
  console.log('updating '+ id)
  db.query(sql_update, [
    office.board,
    office.email,
    office.fax,
    office.office_mui,
    office.office_mls_id,
    office.licence_number,
    office.address,
    office.care_of,
    office.city,
    office.postal_code,
    office.postal_code_plus4,
    office.state,
    office.matrix_unique_id,
    office.matrix_modified_dt,
    office.mls,
    office.mls_id,
    office.mls_provider,
    office.nar_number,
    office.contact_mui,
    office.contact_mls_id,
    office.long_name,
    office.name,
    office.status,
    office.phone,
    office.other_phone,
    office.st_address,
    office.st_city,
    office.st_country,
    office.st_postal_code,
    office.st_postal_code_plus4,
    office.st_state,
    office.url,
    id
  ], cb);
};

Office.getByMUI = function (id, cb) {
  db.query(sql_get_mui, [id], function (err, res) {
    if (err)
      return cb(err);

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Office not found.'));

    return cb(null, res.rows[0].id);
  });
};

module.exports = function () {
};
