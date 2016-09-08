/**
 * @namespace Session
 */

var db            = require('../utils/db.js');
var validator     = require('../utils/validator.js');
var fs            = require('fs');

var sql_insert    = require('../sql/session/insert.sql');
var sql_get_state = require('../sql/session/get_state.sql');

Session = {};


/**
 * * `UpgradeAvailable`
 * * `UpgradeRequired`
 * * `UpgradeUnavailable`
 * * `UpgradeInProgress`
 * @typedef client_version_status
 * @enum {string}
 * @memberof Session
 * @instance
 */

/**
 * @typedef session_response
 * @memberof Session
 * @instance
 * @type {JSON}
 * @property {string} type - this is always `session`
 * @property {string} api_base_url - base URL capable of serving required endpoints
 * @property {Session#client_version_status} client_version_status - status of this client specific to the provided version
 */

/**
 * @typedef session
 * @memberof Session
 * @instance
 * @type {object}
 * @property {string} device_id - ID of the device creating the session
 * @property {string} device_name - name of the device creating the session
 * @property {string} client_version - version of the client app creating the session
 * @property {timestamp} created_at - time and date for the creation of this session
 */

/**
 * @typedef client
 * @memberof Session
 * @instance
 * @type {object}
 * @property {string} version - version issued for client
 * @property {string} secret - client secret
 * @property {string} name - client name
 * @property {Session#client_response} response - _JSON_ object containing information about this client
 */

var schema = {
  type:'object',
  properties: {
    device_id: {
      required: true,
      type: 'string'
    },

    device_name: {
      required: true,
      type: 'string'
    },

    client_version: {
      required: true,
      type: 'string'
    }
  }
};

var validate = validator.bind(null, schema);

/**
 * Creates a `Session` object
 * @name create
 * @function
 * @memberof Session
 * @instance
 * @public
 * @param {Session#session} session - full session object
 * @param {callback} cb - callback function
 */
Session.create = function(session, cb) {
  validate(session, function(err) {
    if(err)
      return cb(err);

    db.query(sql_insert, [
      session.device_id,
      session.device_name,
      session.client_version
    ], cb);
  });
};

/**
 * Retrieves the state of a `Session` object. We use this to issue updates, logouts, etc.
 * If we don't find a record for the specific version of the client, we respond with `UpgradeUnavailable`
 * @name getState
 * @function
 * @memberof Session
 * @instance
 * @public
 * @param {Session#session} session - full session object
 * @param {callback} cb - callback function
 * @returns {Session#session_response}
 */
Session.getState = function(session, cb) {
  validate(session, function(err) {
    if(err)
      return cb(err);

    db.query(sql_get_state, [session.client_version], function(err, res) {
      if(err)
        return cb(err);

      if(!res.rows[0])
        return cb(null, {
          type: 'session',
          api_base_url: 'https://api.rechat.com:443',
          client_version_status: 'UpgradeUnavailable',
          force_logout: false
        });

      return cb(null, res.rows[0].response);
    });
  });
};

module.exports = function(){};
