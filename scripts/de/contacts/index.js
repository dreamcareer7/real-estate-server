#!/usr/bin/env node

const request = require('request-promise-native')
const moment = require('moment')
const _ = require('lodash')

const db = require('../../../lib/utils/db')
const promisify = require('../../../lib/utils/promisify')
const { peanar } = require('../../../lib/utils/peanar')

const MLSJob = require('../../../lib/models/MLSJob')
const Context = require('../../../lib/models/Context')
const Contact = require('../../../lib/models/Contact/manipulate')
const ContactAttribute = require('../../../lib/models/Contact/attribute/get')

const attachModelEventListeners = require('../../../lib/models/Context/events')

const createContext = require('../../workers/utils/create-context')

const map = require('./map')

const config = {
  url: 'https://applicationservice.crm.gabriels.net/api/contacts/8356484'
}

const SAVE = `INSERT INTO de.contacts (id, object)
 SELECT (ar->>'contactId')::int as id, ar FROM json_array_elements($1) ar
 ON CONFLICT (id) DO UPDATE SET object = EXCLUDED.object
 RETURNING *`

const FIND_AGENTS = `SELECT de.users.user, LOWER(de.users.object->>'email') as email, de.agents_offices.brand FROM de.users
  JOIN de.agents_offices ON de.users.username = de.agents_offices.username
  WHERE de.users.object->>'email' IN(
    SELECT LOWER(UNNEST($1::text[]))
  )`

const SET_IDS = `
UPDATE de.contacts
SET contact = pairs.contact
FROM json_populate_recordset(NULL::de.contacts, $1) pairs
WHERE de.contacts.id = pairs.id`

// eslint-disable-next-line
const timeout = ms => {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

const ExternalAuthenticationToken = 'YwBc4k2U5P75bdQreeGxqv6P'
const name = 'de_contacts'
const Size = 300


const groupByAgent = async contacts => {
  const emails = _.chain(contacts).map('object.agentEmail').uniq().filter(Boolean).value()
  const { rows } = await db.executeSql.promise(FIND_AGENTS, [emails])
  const grouped = _.chain(contacts).filter('object.agentEmail').groupBy('object.agentEmail').value()

  return { grouped, agents: _.keyBy(rows, 'email') }
}

const insertContacts = async contacts => {
  const { grouped, agents } = await groupByAgent(contacts)

  Context.log('Grouped')
  const pairs = []

  for(const email of Object.keys(grouped)) {
    if (!agents[email])
      continue

    const { brand, user } = agents[email]

    const agent_contacts = grouped[email]

    const mapped = agent_contacts.map(c => map(c)).map(contact => {
      return { ...contact, user }
    })

    Context.log('Creating', mapped.length, 'contacts')
    const created = await Contact.create(mapped, user, brand, 'lts_lead', {
      activity: false
    })
    Context.log('Done creating', mapped.length, 'contacts')

    for(const i in agent_contacts)
      pairs.push({
        id: agent_contacts[i].id, // Studio ID
        contact: created[i]       // Rechat ID
      })
  }

  await db.executeSql.promise(SET_IDS, [JSON.stringify(pairs)])
}

// eslint-disable-next-line
const updateContacts = async contacts => {
  const { grouped, agents } = await groupByAgent(contacts)

  const attributes = await ContactAttribute.getForContacts(contacts.map(c => c.contact))
  const indexed_attributes = _.groupBy(attributes, 'contact')

  for(const email of Object.keys(grouped)) {
    if (!agents[email])
      continue

    const { brand, user } = agents[email]

    const agent_contacts = grouped[email]

    const mapped = agent_contacts.map(contact => {
      const attributes = indexed_attributes[contact.contact]

      const mapped = map(contact, attributes)

      return {
        ...mapped,
        id: contact.contact,
        user
      }
    })

    await Contact.update(mapped, user, brand, 'lts_lead')
  }
}

const save = async contacts => {
  const { rows } = await db.executeSql.promise(SAVE, [ JSON.stringify(contacts) ])

  const updated = rows.filter(record => Boolean(record.contact))
  const inserted = rows.filter(record => !record.contact)

  return { updated, inserted }
}

const sync = async last => {
  let opts

  const next = moment(last.Date).add(1, 'day').format('YYYY-MM-DD')

  if (last.ScrollId) {
    opts = {
      ScrollId: last.ScrollId
    }
  } else {
    const StartDate = moment(last.Date).format('YYYY-MM-DD') 
    const EndDate = next
    
    opts = {
      StartDate,
      EndDate,
      From: 0,
      Size
    }
  }

  const options = {
    url: config.url,
    qs: {
      ExternalAuthenticationToken,
      ...opts
    },
    json: true
  }

  Context.log('Query', opts)

  const res = await request(options)

  if (!res.Data) {
    Context.log('Error', res.Message)

    await promisify(MLSJob.insert)({
      name,
      query: JSON.stringify({
        Date: last.Date
      })
    })
    return
  }

  const { Data } = res

  Context.log('Retrieved', res.RetrievedContacts, 'of', res.TotalContacts, 'Page', last.Page)

  const { inserted, /*updated*/ } = await save(Data)

  Context.log('Saving Done')

  await insertContacts(inserted)

  Context.log('Inserting Done')
  // await updateContacts(updated)

  let query

  if (Data.length >= Size) {
    query = {
      Date: last.Date,
      ScrollId: res.ScrollId,
      Page: last.Page + 1
    }
  } else {
    query = {
      Date: next,
      Page: 0
    }
  }

  await promisify(MLSJob.insert)({
    name,
    query: JSON.stringify(query),
    results: Data.length
  })
}

const run = async() => {
  await peanar.declareAmqResources()

  attachModelEventListeners()
  
  const { commit, run } = await createContext()

  const initial = {
    Date: '2012-12-29',
    Page: 0
  }

  await run(async () => {
    const last = await promisify(MLSJob.getLastRun)(name) || {
      query: JSON.stringify(initial)
    }

    const query = JSON.parse(last.query)
    await sync(query)

    await commit()
  })
}

run()
  .then(() => {
    process.exit()
  })
  .catch(e => {
    Context.log(e)
    process.exit()
  })
