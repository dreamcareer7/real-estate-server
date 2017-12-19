const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const EventEmitter = require('events').EventEmitter

Form = new EventEmitter
Orm.register('form', 'Form')


require('./submission')

if (process.env.NODE_ENV === 'tests')
  require('./mock.js')


const schema = {
  type: 'object',
  properties: {
    formstack_id: {
      required: true,
      type: 'number'
    },
    name: {
      type: 'string'
    },
    fields: {
      type: 'object'
    }
  }
}

const validate = validator.bind(null, schema)

Form.get = function (id, cb) {
  Form.getAll([id], (err, forms) => {
    if(err)
      return cb(err)

    if (forms.length < 1)
      return cb(Error.ResourceNotFound('Form ' + id + ' not found'))

    const form = forms[0]

    return cb(null, form)
  })
}

Form.getAll = function(form_ids, cb) {
  db.query('form/get', [form_ids], (err, res) => {
    if (err)
      return cb(err)

    const forms = res.rows.map(r => {
      extractRoles(r)
      return r
    })

    return cb(null, forms)
  })
}

Form.getAllForms = function(cb) {
  db.query('form/get_all', [], (err, res) => {
    if (err)
      return cb(err)

    const form_ids = res.rows.map(r => r.id)

    Form.getAll(form_ids, cb)
  })
}

function extractRoles(form) {
  const roles = {}

  if (!form.fields)
    return

  Object.keys(form.fields).forEach(name => {
    const field = form.fields[name]

    if (field.type !== 'role')
      return

    if (!field.assigns || !field.assigns.roles)
      return

    Object.keys(field.assigns.roles).forEach(role => {
      const num = field.assigns.roles[role]

      if (!roles[role])
        roles[role] = {
          type: 'form_role',
          role: role,
          max_count: 0
        }

      if (num > roles[role].max_count)
        roles[role].max_count = num
    })
  })

  form.roles = Object.keys(roles).map(role_name => roles[role_name])
}

Form.getByFormstackId = function (formstack_id, cb) {
  db.query('form/get_formstack', [formstack_id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Form with formstack id ' + formstack_id + ' not found'))

    Form.get(res.rows[0].id, cb)
  })
}

Form.create = function (form, cb) {
  validate(form, function (err) {
    if (err)
      return cb(err)

    db.query('form/insert', [
      form.formstack_id,
      form.name,
      form.fields
    ], (err, res) => {
      if (err)
        return cb(err)

      Form.get(res.rows[0].id, cb)
    })
  })
}

Form.update = function (id, form, cb) {
  validate(form, function (err) {
    if (err)
      return cb(err)

    db.query('form/update', [
      id,
      form.name,
      form.fields
    ], (err, res) => {
      if (err)
        return cb(err)

      Form.get(id, cb)
    })
  })
}

Form.publicize = function(data, options = {}) {
  if (!Array.isArray(options.associations) || !options.associations.includes('form.fields'))
    delete data.fields
}
