const db = require('../../../utils/db.js')
const config       = require('../../../config.js')
const promisify    = require('../../../utils/promisify')
const AttachedFile = require('../../AttachedFile')
const Context = require('../../Context')

const Form = require('../index')
const { get: getUser } = require('../../User/get')
const { get, getRevision, getServiceUrl } = require('./get')



const saveRevisionPdf = async ({created_at, pdf, form, values, metadata, revision, user, deal, path}) => {
  const url = {
    url: getServiceUrl(created_at),
    json: true,
    body: {
      values,
      metadata,
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

const create = async ({form_id, user_id, state, values, metadata, path, deal, pdf}) => {
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
    metadata,
    revision: res_revision.rows[0].id,
    user,
    path,
    deal,
    pdf
  })

  const submission = await get(res_submission.rows[0].id)

  Form.emit('submission created', submission)

  return submission
}

const update = async ({id, user_id, state, values, metadata, path, deal, pdf}) => {
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
    metadata,
    revision: revision.id,
    user,
    path,
    deal,
    pdf,
    created_at: submission.created_at
  })

  return get(submission.id)
}


module.exports = {
  create,
  update
}