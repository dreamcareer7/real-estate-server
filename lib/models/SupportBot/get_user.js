const { findUser } = require('./user')
const { findByUserBrand: findGCByUserBrand } = require('../Google/credential/get')
const { getAll: getAllGoogleCredentials } = require('../Google/credential/getAll')
const { findByUserBrand: findMCByUserBrand } = require('../Microsoft/credential/get')
const { getAll: getAllMicrosoftCredentials } = require('../Microsoft/credential/getAll')
const { getTotalUsedQuota } = require('../Email/campaign/quota')

const { NotFound } = require('./errors')

async function getCredentials(user) {
  /** @type {UUID[]} */
  const brands = user.teams.map(t => t.id)
  const gcredentialIds = await Promise.all(brands.map(b => findGCByUserBrand(user.id, b)))
  const gcredentials = await getAllGoogleCredentials(gcredentialIds.flat())
  const mcredentialIds = await Promise.all(brands.map(b => findMCByUserBrand(user.id, b)))
  const mcredentials = await getAllMicrosoftCredentials(mcredentialIds.flat())
  
  return [
    ...gcredentials.map(gc => ({
      title: `Google Account: ${gc.email}`,
      fields: [{
        title: 'Credential Id',
        value: '`' + gc.id + '`',
        short: false
      }]
    })),
    ...mcredentials.map(mc => ({
      title: `Microsoft Account: ${mc.email}`,
      fields: [{
        title: 'Credential Id',
        value: '`' + mc.id + '`',
        short: false
      }]
    }))
  ]
}

async function command(email) {
  try {
    const user = await findUser(email?.toString()?.trim())

    const fields = [
      {
        title: 'User Id',
        value: '`' + user.id + '`',
        short: false
      },
      {
        title: 'User Type',
        value: user.user_type,
        short: Boolean(user.docusign)
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
    actions.push({
      name: 'get-login-link',
      text: 'Login As User',
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

    if (user.docusign) {
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

    const used_quota = await getTotalUsedQuota()
    fields.push({
      title: 'Quota',
      value: user.email_quota,
      short: true
    })
    fields.push({
      title: 'Remaining Quota',
      value: user.email_quota - used_quota,
      short: true
    })

    const credentials = await getCredentials(user)

    /**
     * @type {any[]}
     */
    const attachments = [
      {
        title: user.display_name,
        thumb_url: user.profile_image_url,
        fields
      }
    ].concat(user.teams.slice(0, 20).map(team => ({
      title: `Team: ${team.name}`,
      fields: [
        {
          title: 'Id',
          value: '`' + team.id + '`',
          short: false
        },
        {
          title: 'Parent',
          value: team.parent_name,
          short: true
        }
      ]
    }))).concat(credentials)

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
