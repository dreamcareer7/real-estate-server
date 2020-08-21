const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')

const { get } = require('./get')

const schema = {
  type: 'object',
  properties: {
    name: {
      type: 'string'
    }
  }
}

const validate = validator.promise.bind(null, schema)


const create = async form => {
  await validate(form)
  const { rows } = await db.query.promise('form/insert', [form.name, form.brand])

  return get(rows[0].id)
}

const update = async (id, form) => {
  await validate(form)
  await db.query.promise('form/update', [id, form.name, form.brand])

  return get(id)
}


module.exports = {
  create,
  update
}