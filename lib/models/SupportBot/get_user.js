const { getUserByEmail } = require('./user')

const { NotFound } = require('./errors')

async function command(email) {
  try {
    const user = await getUserByEmail(email)

    const fields = [
      {
        title: 'User Id',
        value: '`' + user.id + '`',
        short: false
      },
      {
        title: 'User Type',
        value: user.user_type,
        short: true
      }
    ]

    const actions = []

    if (user.token) {
      fields.unshift({
        title: 'Token',
        value: '`' + user.token.token + '`',
        short: false
      })
    }

    if (user.features) {
      fields.push({
        title: 'Features',
        value: user.features.join(', '),
        short: true
      })
    }

    if (user.has_docusign) {
      fields.push({
        title: 'DocuSign',
        value: 'Yes',
        short: true
      })

      actions.push({
        name: 'disconnect-docusign',
        text: 'Disconnect DocuSign',
        type: 'button',
        value: email
      })
    }

    /**
     * @type {any[]}
     */
    const attachments = [
      {
        title: user.display_name,
        thumb_url: user.profile_image_url,
        fields
      },
      {
        title: 'Teams',
        text: user.teams
          .map(team => `* ${team.name} (${team.parent_name})`)
          .join('\n')
      }
    ]
    
    if (actions.length > 0) {
      attachments.push({
        title: 'Actions',
        callback_id: 'user-actions',
        actions
      })
    }

    return {
      attachments
    }
  } catch (ex) {
    if (ex instanceof NotFound) {
      return {
        text: 'No user found for ' + email
      }
    }

    throw ex
  }
}

module.exports = {
  command
}
