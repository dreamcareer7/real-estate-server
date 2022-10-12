const _ = require('lodash')
const db = require('../../../utils/db')
const sql = require('../../../utils/sql')
const { peanar } = require('../../../utils/peanar')

const Context = require('../../Context')
const CrmAssociation = require('../Association')
const Contact = require('../../Contact/fast_filter')
const CrmTag = require('../../Contact/tag')
const EmailCampaignEmail = require('../../Email/campaign/email')
const EmailThread = require('../../Email/thread')
const ListMember = require('../../Contact/list/members')
const Socket = require('../../Socket')

/**
 * Main data manipulation function
 * @param {{ contacts: UUID[]; brand?: UUID; }} job
 */
async function update_touch_times_for_contacts({ contacts, brand }) {
  // Context.log(`[Contact Touch] Updating touch times for ${contacts.length} contacts`)
  const [start, ] = process.hrtime()
  await db.timed('crm/touch/update_touch_times_for_contacts', [ contacts ], 30000)
  const [end, ] = process.hrtime()

  if (end - start > 20) {
    Context.log(`[Contact Touch] The operation took approximately ${end - start} seconds.`)
    Context.log('A few of the contacts in the batch were:', contacts.slice(0, 20))
  }

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
 * @param {{ contacts: UUID[]; brand?: UUID; }} job
 */
async function update_next_touch_for_contacts({ contacts, brand }) {
  if (contacts.length < 1) return

  // Context.log(`[Contact Touch] Updating next touch for ${contacts.length} contacts`)
  await db.timed('crm/touch/update_next_touch_for_contacts', [ contacts ], 30000)

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

async function update_touch_times_for_tasks({ task_ids, brand }) {
  const contacts = await sql.selectIds(`
    SELECT DISTINCT
      contact AS id
    FROM
      crm_associations
    WHERE
      deleted_at IS NULL
      AND association_type = 'contact'
      AND crm_task = ANY($1::uuid[])
  `, [
    task_ids
  ])

  return update_touch_times_for_contacts({ contacts, brand })
}

async function update_touch_times_for_contact_associations_per_user(user_id, ids) {
  const original_user = Context.get('user')
  Context.set({ user: { id: user_id } })
  const associations = await CrmAssociation.getAll(ids)
  Context.set({ user: original_user })

  const groups = _.groupBy(associations, 'brand')

  for (const brand in groups) {
    const contacts = groups[brand].filter(a => a.contact && a.crm_task).map(a => a.contact)
    await update_touch_times_for_contacts({ contacts, brand })
  }
}

async function update_touch_times_for_contact_associations({ associations }) {
  const by_user = _.groupBy(associations, 'created_by')

  for (const user in by_user) {
    await update_touch_times_for_contact_associations_per_user(user, by_user[user].map(a => a.id))
  }
}

async function update_next_touch_for_list_members({ list_id }) {
  const membership_records = await ListMember.findByListId(list_id)
  const contacts = _.uniq(membership_records.map(mr => mr.contact))

  const picked = _.map(membership_records, m => _.pick(m, 'contact', 'list'))
  await db.update(
    'crm/touch/update_contact_touch_freq_by_list_membership',
    [JSON.stringify(picked)],
  )

  const { brand } = await sql.selectOne(
    'SELECT brand FROM crm_lists WHERE id = $1::uuid',
    [ list_id ]
  )

  await update_touch_times_for_contacts({ contacts, brand })
}

/**
 * @param {object} args
 * @param {string[]} args.tags
 * @param {IBrand['id']} args.brand
 * @param {IUser['id']} args.user
 */
async function update_touch_times_for_tags({ tags, brand, user }) {
  const tag_records = await CrmTag.getAll(brand, undefined, undefined, tags)
  const tags_with_tf = tag_records.filter(tag => tag.touch_freq)

  const { ids } = await Contact.fastFilter(brand, user, [{
    attribute_type: 'tag',
    operator: 'any',
    value: tags_with_tf,
  }])

  await db.update('crm/touch/update_contact_touch_freq_by_tags', [brand, tags])

  await update_next_touch_for_contacts({ contacts: ids, brand })
}

async function update_touch_times_for_email_threads({ threads: thread_keys }) {
  const all_threads = await EmailThread.getAll(thread_keys)
  const threads_map = _.groupBy(all_threads, th => `${th.user}@${th.brand}`)

  for (const threads of _.values(threads_map)) {
    const { brand, user } = threads[0]

    const { ids } = await Contact.fastFilter(brand, user, [{
      attribute_type: 'email',
      operator: 'any',
      value: _.uniq(threads.flatMap(t => t.recipients))
    }])

    await update_touch_times_for_contacts({ contacts: ids, brand })
  }
}

async function update_touch_times_for_threads_with_new_messages({ threads: thread_keys, brand }) {
  const contacts = await db.selectIds('crm/touch/special_cases/update_last_touch_from_email_threads', [ thread_keys, brand ])
  // Context.log(`[Contact Touch] Updated last touch for ${contacts.length} contacts from new messages.`)
  await update_next_touch_for_contacts({ contacts, brand })
}

/**
 * @param {{ brand: UUID; user: UUID; emails: string[]; }} param0
 */
async function update_touch_times_for_emails({ brand, user, emails }) {
  const campaign_emails = await EmailCampaignEmail.getAll(emails)

  const { ids } = await Contact.fastFilter(brand, user, [{
    attribute_type: 'email',
    operator: 'any',
    value: campaign_emails.map(e => e.email_address)
  }])

  await update_touch_times_for_contacts({ contacts: ids, brand })
}

/** @param {Pick<IContactListMember, 'contact' | 'list'>[]} members */
async function update_touch_freq_and_next_touch_for_list (members) {
  await db.update(
    'crm/touch/update_contact_touch_freq_by_list_membership',
    [JSON.stringify(members)],
  )

  await update_touch_times_for_contacts({
    contacts: [...new Set(_.map(members, 'contact'))],
  })
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
  update_touch_times_for_tasks: job({
    handler: update_touch_times_for_tasks,
    name: 'update_touch_times_for_tasks',
  }),

  update_touch_times_for_tags: job({
    handler: update_touch_times_for_tags,
    name: 'update_touch_times_for_tags',
  }),

  update_touch_times_for_contacts: job({
    handler: update_touch_times_for_contacts,
    name: 'update_touch_times_for_contacts',
  }),
  update_touch_times_for_contact_associations: job({
    handler: update_touch_times_for_contact_associations,
    name: 'update_touch_times_for_contact_associations',
  }),
  update_next_touch_for_list_members: job({
    handler: update_next_touch_for_list_members,
    name: 'update_next_touch_for_list/members',
  }),
  update_touch_freq_and_next_touch_for_list: job({
    handler: update_touch_freq_and_next_touch_for_list,
    name: 'update_touch_freq_and_next_touch_for_list',
  }),

  update_touch_times_for_emails: job({
    handler: update_touch_times_for_emails,
    name: 'update_touch_times_for_emails',
  }),
  update_touch_times_for_email_threads: job({
    handler: update_touch_times_for_email_threads,
    name: 'update_touch_times_for_email_threads',
  }),
  update_touch_times_for_threads_with_new_messages: job({
    handler: update_touch_times_for_threads_with_new_messages,
    name: 'update_touch_times_for_threads_with_new_messages',
  })
}
