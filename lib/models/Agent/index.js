const db = require('../../utils/db')
const { timeout } = require('../../utils/timeout')
const validator = require('../../utils/validator')

const Agent = {
  ...require('./get')
}

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
      type: ['number', 'string'],
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
      type: ['number', 'string'],
      required: true
    },

    matrix_modified_dt: {
      type: 'string',
      required: false
    },

    license_number: {
      type: 'string',
      required: false
    },

    designation: {
      type: 'string',
      required: false
    },

    nrds: {
      type: 'string',
      required: false
    }
  }
}

const validate = validator.promise.bind(null, schema)

Agent.create = async agent => {
  try {
    await validate(agent)
  } catch (ex) {
    // Usually such errors occur at a high frequency one after another.
    // This will put a little bit of space between them.
    await timeout(500)
    ex.message = ex.message.replace('Validation Error', `Validation Error(${agent.mls})`)
    throw ex
  }

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
    agent.matrix_modified_dt,
    agent.license_number,
    agent.designation,
    agent.mls,
    agent.nrds
  ])

  return rows[0].id
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

Agent.search = async (query, mls) => {
  const { rows } = await db.query.promise('agent/search', [query, mls])

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

  for (const row of rows) {
    let agent
    try {
      /*
       * TODO
       * This was written in an age we only had 1 mls.
       * It used to group agents by mls id.
       * It should've grouped them by mls id and mls name.
       */
      const agents = await Agent.getByMLSID(row.agent)
      agent = agents[0]
    } catch (err) {
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

module.exports = Agent
