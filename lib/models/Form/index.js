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
    name: {
      type: 'string'
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

    return cb(null, res.rows)
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


Form.create = function (form, cb) {
  validate(form, function (err) {
    if (err)
      return cb(err)

    db.query('form/insert', [
      form.name
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
    ], (err, res) => {
      if (err)
        return cb(err)

      Form.get(id, cb)
    })
  })
}