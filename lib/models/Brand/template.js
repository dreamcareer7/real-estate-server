const db = require('../../utils/db')
const promisify = require('../../utils/promisify')

FormTemplate = {}

Orm.register('form_template', 'FormTemplate', FormTemplate)

FormTemplate.create = async template => {
  const {
    form,
    created_by,
    values,
    name,
    deal_types,
    property_types,
    brand
  } = template

  const data = {
    state: 'Draft',
    user_id: created_by,
    form_id: form,
    values
  }

  const submission = await promisify(Form.submit)(data)

  const res = await db.query.promise('brand/template/insert', [
    name,
    deal_types,
    property_types,
    brand,
    form,
    submission.id
  ])

  return FormTemplate.get(res.rows[0].id)
}

FormTemplate.update = async template => {
  const current = await FormTemplate.get(template.id)

  const {
    values,
    name,
    deal_types,
    property_types,
    updated_by
  } = template

  const data = {
    id: current.submission,
    state: 'Draft',
    user_id: updated_by,
    values
  }

  console.log('>>', data)

  const submission = await promisify(Form.updateSubmission)(data)

  const res = await db.query.promise('brand/template/update', [
    name,
    deal_types,
    property_types,
    current.id
  ])

  return FormTemplate.get(template.id)
}

FormTemplate.get = async id => {
  const templates = await FormTemplate.getAll([id])

  if (templates.length < 1)
    throw Error.ResourceNotFound(`Form Template ${id} not found`)

  return templates[0]
}

FormTemplate.getAll = async ids => {
  const res = await db.query.promise('brand/template/get', [ids])

  return res.rows
}

FormTemplate.getByForm = async ({brand, form}) => {
  const { rows } = await db.query.promise('brand/template/by-form', [
    brand,
    form
  ])

  return FormTemplate.getAll(rows.map(r => r.id))
}

FormTemplate.associations = {
  submission: {
    model: 'Submission'
  }
}
