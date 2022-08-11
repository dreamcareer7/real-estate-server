/**
 * @namespace User
 */

require('../../utils/require_asc.js')
require('../../utils/require_html.js')

const Branch = require('../Branch')
const Url = require('../Url')
const Token = require('../Token')
const Client = require('../Client/get')

const db = require('../../utils/db.js')

const User = {
  ...require('./constants'),
  ...require('./get'),
  ...require('./actions'),
  ...require('./password'),
  ...require('./create'),
  ...require('./confirm'),
  ...require('./references'),
  ...require('./notification'),
  ...require('./orm'),
  ...require('./last-seen'),
  ...require('./status'),
  ...require('./patch'),
  ...require('./upgrade'),
  ...require('./brand'),
}

require('./role')
require('./sso')

/**
 * Deletes a `user` object
 * @param {UUID} user_id - ID of the user being deleted
 * @param {Callback<any>} cb - callback function
 */
User.delete = function(user_id, cb) {
  db.query('user/delete', [user_id], cb)
}

User.undelete = async function(user_id) {
  db.update('user/undelete', [user_id])
}

User.getLoginLink = async ({user, client, options = {}}) => {
  const params = {
    uri: '/branch'
  }

  if (!client)
    client = await Client.getDefault()

  const refresh_token = await Token.create({
    client_id: client.id,
    user: user.id,
    token_type: Token.REFRESH,
    expires_at: new Date((Number(new Date)) + (5 * 1000)),
  })

  const data = {
    refresh_token,
    action: 'UserLogin',
    receiving_user: user.id,
    email: user.email,
    ...options
  }

  const url = Url.web(params)
  data['$desktop_url'] = url
  data['$fallback_url'] = url

  return Branch.createURL(data)
}

module.exports = User
