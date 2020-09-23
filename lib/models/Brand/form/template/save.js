const db = require('../../../../utils/db')

const { get } = require('./get')

const save = async template => {
  const {
    created_by,
    form,
    field,
    value,
    brand
  } = template

  const res = await db.query.promise('brand/template/insert', [
    created_by,
    brand,
    form,
    field,
    JSON.stringify(value)
  ])

  return get(res.rows[0].id)
}

async function deleteTemplate({form, field, brand}) {
  return db.query.promise('brand/template/delete', [form, field, brand])
}

module.exports = {
  save,
  delete: deleteTemplate
}
