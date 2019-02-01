const async = require('async')

const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const Orm = require('./Orm')

const GLibPhone = require('google-libphonenumber')

const pnu = GLibPhone.PhoneNumberUtil.getInstance()

const Agent = {}
global['Agent'] = Agent

Agent.ACTIVE = 'Active'
Agent.INACTIVE = 'Inactive'

const schema = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      required: false
    },

    mlsid: {
      type: 'string',
      required: true
    },

    fax: {
      type: 'string',
      required: false
    },

    first_name: {
      type: 'string',
      required: false
    },

    last_name: {
      type: 'string',
      required: false
    },

    full_name: {
      type: 'string',
      required: false
    },

    middle_name: {
      type: 'string',
      required: false
    },

    phone_number: {
      type: 'string',
      required: false
    },

    nar_number: {
      type: 'string',
      required: false
    },

    office_mui: {
      type: 'number',
      required: false
    },

    status: {
      type: 'string',
      required: false
    },

    office_mlsid: {
      type: 'string',
      required: false
    },

    work_phone: {
      type: 'string',
      required: false
    },

    generational_name: {
      type: 'string',
      required: false
    },

    matrix_unique_id: {
      type: 'number',
      required: true
    },

    matrix_modified_dt: {
      type: 'string',
      required: false
    }
  }
}

const validate = validator.promise.bind(null, schema)

Agent.create = async agent => {
  await validate(agent)

  const { rows } = await db.query.promise('agent/insert', [
    agent.email,
    agent.mlsid,
    agent.fax,
    agent.full_name,
    agent.first_name,
    agent.last_name,
    agent.middle_name,
    agent.phone_number,
    agent.nar_number,
    agent.office_mui,
    agent.status,
    agent.office_mlsid,
    agent.work_phone,
    agent.generational_name,
    agent.matrix_unique_id,
    agent.matrix_modified_dt
  ])

  return rows[0].id
}

Agent.get = async id => {
  const agents = await Agent.getAll([id])

  if (agents.length < 1)
    return cb(Error.ResourceNotFound(`Agent ${id} not found`))

  return agents[0]
}

Agent.getAll = async ids => {
  const { rows } = await db.query.promise('agent/get', [ids])

  // agent.emails and agent.phone_numbers must be populated by sql.
  // However, that depends on certain materialized views being refreshed (agents_emails and agents_phone)
  // If (for any reason they have not been refreshed yet, populate the arrays with the least information we have

  const agents = rows

  for(const agent of agents) {
    if (!agent.phone_numbers && agent.phone_number)
      agent.phone_numbers = [agent.phone_number]

    if (!agent.emails && agent.email)
      agent.emails = [agent.email]

    if (agent.phone_numbers)
      agent.phone_numbers = agent.phone_numbers.map(formatPhone)
  }

  return agents
}

Agent.auditSecret = async (id, secret) => {
  const agent = await Agent.get(id)

  let found = false

  if (agent.phone_numbers)
    agent.phone_numbers.forEach(phone => {
      const cleaned_phone = phone.replace(/\D/g, '')
      const cleaned_secret = secret.replace(/\D/g, '')

      if (cleaned_phone === cleaned_secret)
        found = true
    })

  if (agent.emails)
    agent.emails.forEach(email => {
      if (email.toLowerCase() === secret.toLowerCase())
        found = true
    })

  if (found)
    return agent

  throw Error.Unauthorized('Invalid answer to secret question')
}

Agent.getByMLSID = async id => {
  const { rows } = await db.query.promise('agent/get_mlsid', [id])

  if (rows.length < 1)
    throw Error.ResourceNotFound('Agent corresponding to this MLS ID (' + id + ') not found')

  return Agent.get(rows[0].id)
}

Agent.getByOfficeId = async office_mls => {
  const { rows } = await db.query.promise('agent/office_mls', [office_mls])

  const ids = rows.map(a => a.id)

  const agents = await Agent.getAll(ids)

  if (agents.length > 0)
    agents[0].total = rows[0].total

  return agents
}

Agent.matchByEmail = async email => {
  const { rows } = await db.query.promise('agent/match_by_email', [email])

  if (rows.length < 1)
    return

  return {
    first_name: rows[0].first_name,
    last_name: rows[0].last_name,
    id: rows[0].id
  }
}

Agent.search = async query => {
  const { rows } = await db.query.promise('agent/search', [query])

  return Agent.getAll(rows.map(r => r.id))
}

Agent.report = async criteria => {
  const { rows } = await db.query.promise('agent/report', [
    criteria.area || null,
    criteria.sub_area || null,
    criteria.from || null,
    criteria.to || null,
    criteria.list_volume.min || null,
    criteria.list_volume.max || null,
    criteria.list_value.min || null,
    criteria.list_value.max || null,
    criteria.sell_volume.min || null,
    criteria.sell_volume.max || null,
    criteria.sell_value.min || null,
    criteria.sell_value.max || null,
    criteria.active_volume.min || null,
    criteria.active_volume.max || null,
    criteria.active_value.min || null,
    criteria.active_value.max || null,
    criteria.total_active_volume.min || null,
    criteria.total_active_volume.max || null,
    criteria.total_active_value.min || null,
    criteria.total_active_value.max || null,
    criteria.agent_experience || null,
    criteria.total_value.min || null,
    criteria.total_value.max || null,
    criteria.total_volume.min || null,
    criteria.total_volume.max || null
  ])

  const agents = []

  for(const row of rows) {
    let agent
    try {
      agent = await Agent.getByMLSID(row.agent)
    } catch(err) {
      if (err.code !== 'ResourceNotFound')
        throw err

      agent = {
        type: 'agent',
        first_name: 'Unknown Agent',
        last_name: '(' + row.agent + ')',
        data: row,
        mlsid: row.agent
      }
    }

    agents.push(agent)
  }

  return agents
}


Agent.refreshContacts = async () => {
  await db.query.promise('agent/refresh_phones', [])
  await db.query.promise('agent/refresh_emails', [])
}

const obfuscatePhone = string => {
  let obfuscated = string.replace(/\d/g, 'X')
  obfuscated = obfuscated.slice(0, obfuscated.length - 2) + string.slice(-2) // Last two digits always visible

  const parenthesis = string.match(/^(\s){0,}\((\d){1,}\)/)
  if (!parenthesis) {
    return string.slice(0, 2) + obfuscated.slice(2)
  }

  return parenthesis[0] + obfuscated.slice(parenthesis[0].length)
}

const formatPhone = string => {
  try {
    const p = pnu.parse(string, 'US')
    return pnu.format(p, GLibPhone.PhoneNumberFormat.NATIONAL)
  } catch(e) {
    return ''
  }
}

Agent.publicize = model => {
  delete model.matrix_modified_dt

  let questions = []

  if (model.phone_numbers) {
    questions = questions.concat(model.phone_numbers.map(obfuscatePhone))
    delete model.phone_numbers
  }

  if (model.emails) {
    questions = questions.concat(model.emails.map(ObjectUtil.obfuscateString))
    delete model.emails
  }

  model.secret_questions = questions

  return model
}

Agent.associations = {
  office: {
    enabled: false,
    optional: true,
    id: (a, cb) => cb(null, a.office_id),
    model: 'Office'
  }
}

Orm.register('agent', 'Agent', Agent)

module.exports = Agent
