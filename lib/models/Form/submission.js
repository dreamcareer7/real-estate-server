const config = require('../../config.js')
const db = require('../../utils/db.js')
const Orm = require('../Orm')
const promisify = require('../../utils/promisify')
const AttachedFile = require('../AttachedFile')
const request = require('request-promise-native')

const Form = require('./index')

const Submission = {}

Submission.FAIR = 'Fair'
Submission.DRAFT = 'Draft'

Submission.associations = {
  file: {
    model: 'AttachedFile'
  }
}

Orm.register('form_submission', 'Submission', Submission)

const saveRevisionPdf = async ({pdf, form, values, metadata, revision, user, deal, path}) => {
  const url = {
    url: `${config.forms.url}/generate.pdf`,
    method: 'POST',
    json: true,
    body: {
      values,
      metadata,
      url: pdf,
      deal,
    }
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

Submission.create = async ({form_id, user_id, state, values, metadata, path, deal, pdf}) => {
  if (!form_id)
    throw new Error.Generic('Cannot save submission with no form id')

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

  const user = await User.get(user_id)

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

  const submission = await Submission.get(res_submission.rows[0].id)

  Form.emit('submission created', submission)

  return submission
}

Submission.update = async ({id, user_id, state, values, metadata, path, deal, pdf}) => {
  const submission = await Submission.get(id)
  const form = await Form.get(submission.form)

  const res_revision = await db.query.promise('form/data/insert', [
    user_id,
    form.id,
    submission.id,
    state,
    values,
    null
  ])

  const revision = await Submission.getRevision(res_revision.rows[0].id)

  const user = await User.get(user_id)

  await saveRevisionPdf({
    form,
    values,
    metadata,
    revision: revision.id,
    user,
    path,
    deal,
    pdf
  })

  return Submission.get(submission.id)
}

Submission.flatten = async (rev) => {
  const file = await AttachedFile.get(rev.file)

  const r = {
    url: `${config.forms.url}/generate.pdf`,
    method: 'POST',
    json: true,
    body: {
      url: file.url,
      flat: true
    },
    encoding: null
  }

  return request(r)
}

Submission.get = async id => {
  const submissions = await Submission.getAll([id])

  if (submissions.length < 1)
    throw Error.ResourceNotFound(`Submission ${id} not found`)

  return submissions[0]
}

Submission.getAll = async ids => {
  const { rows } = await db.query.promise('form/submission/get', [ids])
  return rows
}

Submission.getRevision = async id => {
  const revisions = await Submission.getAllRevisions([id])

  if (revisions.length < 1)
    throw Error.ResourceNotFound(`Submission revision ${id} not found`)

  return revisions[0]
}

Submission.getAllRevisions = async revisions => {
  const { rows } = await db.query.promise('form/submission/get_revision', [
    revisions
  ])

  return rows
}

module.exports = Submission
