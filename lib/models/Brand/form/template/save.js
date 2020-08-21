const db = require('../../../../utils/db')
const Submission = require('../../../Form/submission')

const { get } = require('./get')

const create = async template => {
  const {
    form,
    created_by,
    values,
    metadata,
    name,
    deal_types,
    property_types,
    brand
  } = template

  const data = {
    state: 'Draft',
    user_id: created_by,
    form_id: form,
    values,
    metadata
  }

  const submission = await Submission.create(data)

  const res = await db.query.promise('brand/template/insert', [
    name,
    deal_types,
    property_types,
    brand,
    form,
    submission.id
  ])

  return get(res.rows[0].id)
}

const update = async template => {
  const current = await get(template.id)

  const {
    values,
    metadata,
    name,
    deal_types,
    property_types,
    updated_by
  } = template

  const data = {
    id: current.submission,
    state: 'Draft',
    user_id: updated_by,
    values,
    metadata
  }

  await Submission.update(data)

  await db.query.promise('brand/template/update', [
    name,
    deal_types,
    property_types,
    current.id
  ])

  return get(template.id)
}

module.exports = {
  create,
  update
}
