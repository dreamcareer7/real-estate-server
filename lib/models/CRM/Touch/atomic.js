const db = require('../../../utils/db')
const sql = require('../../../utils/sql')
const { peanar } = require('../../../utils/peanar')

const Contact = require('../../Contact/fast_filter')
const Context = require('../../Context')
const EmailCampaignEmail = require('../../Email/campaign/email/get')
const EmailCampaign = require('../../Email/campaign/get')
const GoogleCredential = require('../../Google/credential/getAll')
const MicrosoftCredential = require('../../Microsoft/credential/getAll')
const Socket = require('../../Socket')

/**
 * Main data manipulation function
 * @param {{ contacts: UUID[]; brand?: UUID; timestamp: number; action: string; }} job 
 */
async function increase_touch_times_for_contacts({ contacts, brand, timestamp, action }) {
  Context.log({ contacts, brand, timestamp, action })
  await db.selectIds('crm/touch/increase_touch_times_for_contacts', [
    contacts,
    timestamp,
    action
  ])

  if (!brand) {
    /** @type {{ brand: UUID; contacts: UUID[] }[]} */
    const contact_brands = await sql.select(`
      SELECT
        brand, array_agg(id) AS contacts
      FROM
        contacts
      WHERE
        id = ANY($1::uuid[])
      GROUP BY
        brand
    `, [contacts])
  
    for (const item of contact_brands) {
      Socket.send(
        'contact:touch',
        item.brand,
        [{ contacts: item.contacts }],
    
        err => {
          if (err) Context.error('>>> (Socket) Error sending contact:touch socket event.', err)
        }
      )
    }
  } else {
    Socket.send(
      'contact:touch',
      brand,
      [{ contacts }],
  
      err => {
        if (err) Context.error('>>> (Socket) Error sending contact:touch socket event.', err)
      }
    )
  }
}

/**
 * @param {{ brand: UUID; user: UUID; campaign: UUID; emails: string[]; }} param0
 */
async function update_touch_times_for_emails({ brand, user, campaign, emails }) {
  if (emails.length < 1) return

  const { executed_at } = await EmailCampaign.get(campaign)
  const campaign_emails = await EmailCampaignEmail.getAll(emails)

  const { ids } = await Contact.fastFilter(brand, user, [
    {
      attribute_type: 'email',
      operator: 'any',
      value: campaign_emails.map((e) => e.email_address),
    },
  ])

  await increase_touch_times_for_contacts({ contacts: ids, brand, timestamp: executed_at, action: 'email' })
}

/**
 * @param {{ microsoft_credential: UUID; google_credential: UUID; recipients: string[]; timestamp: number; }} param0
 */
async function update_touch_times_for_synced_messages({ microsoft_credential, google_credential, timestamp, recipients }) {
  async function update(brand, user) {
    const { ids } = await Contact.fastFilter(brand, user, [
      {
        attribute_type: 'email',
        operator: 'any',
        value: recipients,
      },
    ])

    await increase_touch_times_for_contacts({ contacts: ids, brand, timestamp, action: 'email' })
  }

  if (microsoft_credential) {
    const [{ brand, user }] = await MicrosoftCredential.getAll([microsoft_credential])
    await update(brand, user)
  } else if (google_credential) {
    const [{ brand, user }] = await GoogleCredential.getAll([google_credential])
    await update(brand, user)
  } else {
    throw new Error('Invalid payload: either google_credential or microsoft_credential needs to be specified')
  }
}

function job(opts) {
  return peanar.job({
    ...opts,
    queue: 'touches',
    exchange: 'touches',
    error_exchange: 'touches.error',
    retry_exchange: 'touches.retry',
    max_retries: 10,
    retry_delay: 2000
  })
}

module.exports = {
  update_touch_times_for_emails: job({
    handler: update_touch_times_for_emails,
    name: 'update_touch_times_for_emails',
  }),
  update_touch_times_for_synced_messages: job({
    handler: update_touch_times_for_synced_messages,
    name: 'update_touch_times_for_synced_messages',
  }),
}
