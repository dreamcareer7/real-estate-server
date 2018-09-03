const { getUserByEmail } = require('./user')
const { getOfficeBrands } = require('./brand')

const { NotFound } = require('./errors')

async function command(email) {
  try {
    const user = await getUserByEmail(email)
    let office_brands
    
    try {
      office_brands = await getOfficeBrands()
    }
    catch (ex) {
      if (ex instanceof NotFound) {
        office_brands = []
      }
      else {
        throw ex
      }
    }

    const fields = [
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

    const office_brands_list = {
      title: 'Move to another office',
      callback_id: 'User:' + user.id,
      actions: [
        {
          name: 'move_user_brands_to_office',
          text: 'Choose office...',
          type: 'select',

          options: office_brands.map(o => ({
            text: o.branch_title,
            value: o.id
          }))
        }
      ]
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
