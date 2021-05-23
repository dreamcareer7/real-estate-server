#!/usr/bin/env node

const request = require('request-promise-native')
const moment = require('moment')
const _ = require('lodash')

const db = require('../../../lib/utils/db')
const promisify = require('../../../lib/utils/promisify')

const User = require('../../../lib/models/User/get')
const MLSJob = require('../../../lib/models/MLSJob')
const Context = require('../../../lib/models/Context')
const Contact = require('../../../lib/models/Contact/manipulate')

const createContext = require('../../workers/create-context')

const map = require('./map')

const config = {
  url: 'https://applicationservice.crm.gabriels.net/api/contacts/8356484'
}

const SAVE = `INSERT INTO de.contacts (id, object)
 SELECT (ar->>'contactId')::int as id, ar FROM json_array_elements($1) ar
 ON CONFLICT (id) DO UPDATE SET object = EXCLUDED.object
 RETURNING *`

const NEW_RECORDS = `SELECT id FROM de.contacts WHERE contact IS NULL`

const FIND_AGENTS = `
SELECT de.users."user", de.agents_offices.brand FROM de.users
  JOIN de.agents_offices ON de.users.username = de.agents_offices.username
WHERE de.users.object->>'email' IN(
  SELECT LOWER(UNNEST($1::text[]))
)`

const SET_IDS = `
UPDATE de.contacts
SET contact = pairs.contact
FROM json_populate_recordset(NULL::de.contacts, $1) pairs
WHERE de.contacts.id = pairs.id`

const brand_id = 'aea06fd2-bb66-11eb-8eb7-d5797ff4de7c'
const user_id = '80a227b2-29a0-11e7-b636-e4a7a08e15d4'

const insertContacts = async contacts => {
  const emails = _.chain(contacts).map('object.agentEmail').uniq().filter(Boolean).value()
  const { rows } = await db.executeSql.promise(FIND_AGENTS, [emails])
  const grouped = _.chain(contacts).filter('object.agentEmail').groupBy('object.agentEmail').value()


  //TODO: Read user_id and brand_id from rows

  const pairs = []

  for(const email of Object.keys(grouped)) {
    const agent_contacts = grouped[email]

    const mapped = agent_contacts.map(map)
    const created = await Contact.create(mapped, user_id, brand_id, 'lts_lead')

    for(const i in agent_contacts)
      pairs.push({
        id: agent_contacts[i].id, // Studio ID
        contact: created[i]       // Rechat ID
      })
  }

  await db.executeSql.promise(SET_IDS, [JSON.stringify(pairs)])
}

const updateContacts = async contacts => {

}

const save = async contacts => {
  const { rows } = await db.executeSql.promise(SAVE, [ JSON.stringify(contacts) ])

  const updated = rows.filter(record => Boolean(record.contact))
  const inserted = rows.filter(record => !Boolean(record.contact))

  return { updated, inserted }
}

const sync = async ({
  StartDate,
  EndDate,
  From,
  Size
}) => {
  const ExternalAuthenticationToken = 'YwBc4k2U5P75bdQreeGxqv6P'

  const opts = {
    url: config.url,
    qs: {
      ExternalAuthenticationToken,
      StartDate,
      EndDate,
      From,
      Size
    },
    json: true
  }
  const res = await request(opts)
  const { Data, TotalContacts } = res

  const { inserted, updated } = await save(Data)

  await insertContacts(inserted)
  await updateContacts(updated)

  console.log(Data.length + From, TotalContacts)
  return Data.length
}

const run = async() => {
  const { commit, run } = await createContext()

  const name = 'de-contacts'
  const step = 1
  const limit = 1000

  await run(async () => {
    const last = await promisify(MLSJob.getLastRun)(name) || {
      query: '2019-12-29',
      limit,
      offset: 0,
      results: 0
    }

    const format = 'YYYY-MM-DD'

    let StartDate, EndDate, From
    if (last.results < limit) {
      StartDate = moment(last.query).format(format)
      EndDate = moment(last.query).add(step, 'day').format(format)
      From = 0
    } else {
      StartDate = moment(last.query).subtract(step, 'day').format(format)
      EndDate = moment(last.query).format(format)
      From = last.results + last.offset
    }

    const opts = {
      StartDate,
      EndDate,
      Size: limit,
      From
    }

    const results = await sync(opts)

    Context.log('Synced', StartDate, EndDate, results, 'results')

    await promisify(MLSJob.insert)({
      name,
      query: EndDate,
      offset: From,
      results,
      limit
    })

    await commit()
  })
}

run()
  .then(() => {
    process.exit()
  })
  .catch(e => {
    console.log(e)
    process.exit()
  })
