const db = require('../../utils/db')
const promisify = require('../../utils/promisify')

Brand.getTemplate = async ({brand, form}) => {
  const res = await db.query.promise('brand/template/get', [
    brand,
    form
  ])

  if (!res.rows[0])
    return

  return promisify(Form.getSubmission)(res.rows[0].submission)
}

Brand.getTemplates = async ({brand, form}) => {
  const res = await db.query.promise('brand/template/all', [
    brand,
    form
  ])

  return promisify(Form.getAllRevisions)(res.rows.map(r => r.revision))
}

Brand.setTemplate = async ({user, brand, values, form}) => {

  const current = await Brand.getTemplate({form, brand})
  let submission

  const data = {
    state: 'Draft',
    pdf: false,
    user_id: user,
    form_id: form,
    values
  }

  if (current) {
    data.id = current.id
    await promisify(Form.updateSubmission)(data)
    submission = await promisify(Form.getSubmission)(current.id)

  } else {
    const submission = await promisify(Form.submit)(data)

    await db.query.promise('brand/template/set', [
      brand,
      form,
      submission.id
    ])
  }

  return submission
}