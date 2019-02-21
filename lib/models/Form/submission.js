const config = require('../../config.js')
const db = require('../../utils/db.js')
const Orm = require('../Orm')
const promisify = require('../../utils/promisify')
const AttachedFile = require('../AttachedFile')

Submission = {}

Submission.FAIR = 'Fair'
Submission.DRAFT = 'Draft'

Submission.associations = {
  file: {
    model: 'AttachedFile'
  }
}

Orm.register('form_submission', 'Submission')

const saveRevisionPdf = async ({pdf, form, values, revision, user, deal, path}) => {
  const url = {
    url: `${config.forms.url}/generate.pdf`,
    method: 'POST',
    json: true,
    body: {
      values,
      url: pdf,
      deal,
    }
  }

  return promisify(AttachedFile.saveFromUrl)({
    path,
    filename: encodeURIComponent(form.name) + '.pdf',
    url,
    user,
    relations: [
      {
        role: 'SubmissionRevision',
        id: revision
      }
    ]
  })
}

Form.submit = async ({form_id, user_id, state, values, path, deal, pdf}) => {
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
    revision: res_revision.rows[0].id,
    user,
    path,
    deal,
    pdf
  })

  const submission = await Form.getSubmission(res_submission.rows[0].id)

  Form.emit('submission created', submission)

  return submission
}

Form.updateSubmission = async ({id, user_id, state, values, path, deal, pdf}) => {
  const submission = await Form.getSubmission(id)
  const form = await Form.get(submission.form)

  const res_revision = await db.query.promise('form/data/insert', [
    user_id,
    form.id,
    submission.id,
    state,
    values,
    null
  ])

  const revision = await Form.getRevision(res_revision.rows[0].id)

  const user = await User.get(user_id)

  await saveRevisionPdf({
    form,
    values,
    revision: revision.id,
    user,
    path,
    deal,
    pdf
  })

  return Form.getSubmission(submission.id)
}

Form.getSubmission = async id => {
  const submissions = await Form.getAllSubmissions([id])

  if (submissions.length < 1)
    throw Error.ResourceNotFound(`Submission ${id} not found`)

  return submissions[0]
}

Form.getAllSubmissions = async ids => {
  const { rows } = await db.query.promise('form/submission/get', [ids])
  return rows
}


Form.getRevision = async id => {
  const revisions = await Form.getAllRevisions([id])

  if (revisions.length < 1)
    throw Error.ResourceNotFound(`Submission revision ${id} not found`)

  return revisions[0]
}

Form.getAllRevisions = async revisions => {
  const { rows } = await db.query.promise('form/submission/get_revision', [
    revisions
  ])

  return rows
}


Submission.get = Form.getSubmission
Submission.getAll = Form.getAllSubmissions
