const async = require('async')

const db = require('../utils/db.js')
const validator = require('../utils/validator.js')

const GLibPhone = require('google-libphonenumber')

const pnu = GLibPhone.PhoneNumberUtil.getInstance()

Agent = {}

Orm.register('agent', 'Agent')

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

const validate = validator.bind(null, schema)

Agent.create = function (agent, cb) {
  validate(agent, function (err) {
    if (err)
      return cb(err)

    db.query('agent/insert', [
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
    ], cb)
  })
}

Agent.get = function (id, cb) {
  db.query('agent/get', [id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound(`Agent ${id} not found`))

    const agent = res.rows[0]

    // agent.emails and agent.phone_numbers must be populated by sql.
    // However, that depends on certain materialized views being refreshed (agents_emails and agents_phone)
    // If (for any reason they have not been refreshed yet, populate the arrays with the least information we have

    if (!agent.phone_numbers && agent.phone_number)
      agent.phone_numbers = [agent.phone_number]

    if (!agent.emails && agent.email)
      agent.emails = [agent.email]

    if (agent.phone_numbers)
      agent.phone_numbers = agent.phone_numbers.map(formatPhone)

    agent.online_state = User.OFFLINE

    if (!agent.user_id) {
      cb(null, agent)
      return
    }

    // eslint-disable-next-line handle-callback-err
    User.getStatus(agent.user_id, (err, state) => {
      agent.online_state = err ? User.OFFLINE : state
      cb(null, agent)
    })
  })
}

Agent.auditSecret = function (id, secret, cb) {
  Agent.get(id, (err, agent) => {
    if (err)
      return cb(err)

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
      return cb(null, true)

    return cb(Error.Unauthorized('Invalid answer to secret question'))
  })
}

Agent.getByMLSID = function (id, cb) {
  db.query('agent/get_mlsid', [id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Agent corresponding to this MLS ID (' + id + ') not found'))

    return Agent.get(res.rows[0].id, cb)
  })
}

Agent.getByOfficeId = function (office_mls, cb) {
  db.query('agent/office_mls', [office_mls], (err, res) => {
    if (err)
      return cb(err)

    const agent_ids = res.rows.map(a => a.id)

    async.map(agent_ids, Agent.get, function (err, agents) {
      if (err)
        return cb(err)

      if (res.rows.length > 0)
        agents[0].total = res.rows[0].total

      return cb(null, agents)
    })
  })
}

Agent.matchByEmail = function (email, cb) {
  db.query('agent/match_by_email', [email], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb()

    return cb(null, {
      first_name: res.rows[0].first_name,
      last_name: res.rows[0].last_name,
      id: res.rows[0].id
    })
  })
}

Agent.search = function (query, cb) {
  db.query('agent/search', [query], function (err, res) {
    if (err)
      return cb(err)

    async.map(res.rows.map(r => r.id), Agent.get, cb)
  })
}

Agent.report = function (criteria, cb) {
  const fillAgent = (data, cb) => {
    Agent.getByMLSID(data.agent, (err, agent) => {
      if (err && err.code === 'ResourceNotFound') {
        const unknown = {
          type: 'agent',
          first_name: 'Unknown Agent',
          last_name: '(' + data.agent + ')',
          data: data,
          mlsid: data.agent
        }

        delete agent.data.agent

        return cb(null, unknown)
      }

      if (err)
        return cb(err)

      agent.data = data
      delete agent.data.agent

      cb(null, agent)
    })
  }

  db.query('agent/report', [
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
  ], (err, res) => {
    if (err)
      return cb(err)

    async.mapLimit(res.rows, 1, fillAgent, cb)
  })
}

Agent.refreshContacts = function (cb) {
  db.query('agent/refresh_phones', [], err => {
    if (err)
      return cb(err)

    db.query('agent/refresh_emails', [], cb)
  })
}

function obfuscatePhone (string) {
  let obfuscated = string.replace(/\d/g, 'X')
  obfuscated = obfuscated.slice(0, obfuscated.length - 2) + string.slice(-2) // Last two digits always visible

  const parenthesis = string.match(/^(\s){0,}\((\d){1,}\)/)
  if (!parenthesis) {
    return string.slice(0, 2) + obfuscated.slice(2)
  }

  return parenthesis[0] + obfuscated.slice(parenthesis[0].length)
}

function formatPhone (string) {
  try {
    const p = pnu.parse(string, 'US')
    return pnu.format(p, GLibPhone.PhoneNumberFormat.NATIONAL)
  } catch(e) {
    return ''
  }
}

Agent.publicize = function (model) {
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

module.exports = function () {}
