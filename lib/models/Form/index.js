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

const validate = validator.promise.bind(null, schema)

Form.get = async id => {
  const forms = await Form.getAll([id])

  if (forms.length < 1)
    throw Error.ResourceNotFound(`Form ${id} not found`)

  return forms[0]
}

Form.getAll = async ids => {
  const { rows } = await db.query.promise('form/get', [ids])
  return rows
}

Form.getByBrand = async (brand) => {
  const { rows } = await db.query.promise('form/by-brand', [brand])
  const ids = rows.map(r => r.id)
  return Form.getAll(ids)
}


Form.create = async form => {
  await validate(form)

  const { rows } = await db.query.promise('form/insert', [
    form.name,
    form.brand
  ])

  return Form.get(rows[0].id)
}

Form.update = async (id, form) => {
  await validate(form)

  await db.query.promise('form/update', [
    id,
    form.name,
    form.brand
  ])

  return Form.get(id)
}
