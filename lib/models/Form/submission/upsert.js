const db = require('../../../utils/db.js')
const promisify    = require('../../../utils/promisify')
const AttachedFile = require('../../AttachedFile')

const Form = {
  ...require('../get'),
  ...require('../emit'),
}

const { get: getUser } = require('../../User/get')
const { get, getRevision, getServiceUrl } = require('./get')



const saveRevisionPdf = async ({created_at, pdf, form, values, instructions, revision, user, path}) => {
  const url = {
    url: getServiceUrl(created_at),
    json: true,
    body: {
      values,
      instructions,
      url: pdf,
    },
    method: 'POST'
  }

  return promisify(AttachedFile.saveFromUrl)({
    path,
    filename: `${form.name}.pdf`,
    url,
    user,
    relations: [
      {
        role: 'SubmissionRevision',
        role_id: revision
      }
    ]
  })
}

const create = async ({form_id, user_id, state, values, instructions, path, pdf}) => {
  if (!form_id) {
    throw Error.Generic('Cannot save submission with no form id')
  }

  const form = await Form.get(form_id)

  const res_submission = await db.query.promise('form/submission/insert', [
    form_id,
    null
  ])

  const res_revision = await db.query.promise('form/data/insert', [
    user_id,
    form_id,
    res_submission.rows[0].id,
    state,
    values,
    null
  ])

  const user = await getUser(user_id)

  await saveRevisionPdf({
    form,
    values,
    instructions,
    revision: res_revision.rows[0].id,
    user,
    path,
    pdf
  })

  const submission = await get(res_submission.rows[0].id)

  Form.emit('submission created', submission)

  return submission
}

const update = async ({id, user_id, state, values, instructions, path, pdf}) => {
  const submission = await get(id)
  const form = await Form.get(submission.form)

  const res_revision = await db.query.promise('form/data/insert', [
    user_id,
    form.id,
    submission.id,
    state,
    values,
    null
  ])

  const revision = await getRevision(res_revision.rows[0].id)

  const user = await getUser(user_id)

  await saveRevisionPdf({
    form,
    values,
    instructions,
    revision: revision.id,
    user,
    path,
    pdf,
    created_at: submission.created_at
  })

  return get(submission.id)
}


module.exports = {
  create,
  update
}
