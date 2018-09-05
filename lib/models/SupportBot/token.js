const moment = require('moment')

const sql = require('./sql')

const { NotFound } = require('./errors')

async function getTokenForUser(email) {
  return sql.selectOne(
    'SELECT * FROM get_token_for_user($1)',
    [email]
  )
}

async function command(email) {
  try {
    const tokenRow = await getTokenForUser(email)

    return {
      response_type: 'in_channel',
      text: '`' + tokenRow.token + '`',
      attachments: [
        {
          text: `Expires at ${moment(tokenRow.expires_at).format('YYYY-MM-DD')}`
        }
      ]
    }
  } catch (ex) {
    if (ex instanceof NotFound) {
      return {
        response_type: 'in_channel',
        text: 'No token found for ' + email
      }
    }

    throw ex
  }
}

module.exports = {
  getTokenForUser,
  command
}
