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

    actions.push({
      name: 'open-move-contacts',
      text: 'Move Contacts',
      type: 'button',
      value: user.id
    })
    actions.push({
      name: 'open-move-deals',
      text: 'Move Deals',
      type: 'button',
      value: user.id
    })

    if (user.token) {
      fields.unshift({
        title: 'Token',
        value: '`' + user.token.token + '`',
        short: false
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
      }
    ].concat(user.teams.map(team => ({
      title: `Team: ${team.name}`,
      fields: [
        {
          title: 'Id',
          value: team.id,
          short: true
        },
        {
          title: 'Parent',
          value: team.parent,
          short: true
        }
      ]
    })))

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
