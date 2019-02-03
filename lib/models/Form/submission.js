const async = require('async')
const config = require('../../config.js')
const db = require('../../utils/db.js')
const Orm = require('../Orm')
const AttachedFile = require('../AttachedFile')

Submission = {}

Submission.associations = {
  file: {
    model: 'AttachedFile'
  }
}

Orm.register('form_submission', 'Submission')

const saveRevisionPdf = ({pdf, form, values, revision, user, deal, path}, cb) => {
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

  AttachedFile.saveFromUrl({
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
  }, cb)
}

Form.submit = ({form_id, user_id, state, values, path, deal, pdf}, cb) => {
  const getForm = cb => {
    Form.get(form_id).nodeify(cb)
  }

  const createSubmission = (cb, results) => {
    db.query('form/submission/insert', [
      form_id,
      null
    ], cb)
  }

  const insertData = (cb, results) => {
    db.query('form/data/insert', [
      user_id,
      form_id,
      results.create.rows[0].id,
      state,
      values,
      null
    ], cb)
  }

  const getSubmission = (cb, results) => {
    Form.getSubmission(results.create.rows[0].id, cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    Form.emit('submission created', results.saved)
    cb(err, results.saved)
  }

  const savePdf = (cb, results) => {
    saveRevisionPdf({
      form: results.form,
      values,
      revision: results.data.rows[0].id,
      user: results.user,
      path,
      deal,
      pdf
    }, cb)
  }

  async.auto({
    form: getForm,
    create: ['form', createSubmission],
    data: ['create', insertData],
    revision: ['data', (cb, results) => Form.getRevision(results.data.rows[0].id, cb)],
    user: cb => User.get(user_id).nodeify(cb),
    pdf: ['data', 'user', savePdf],
    saved: ['pdf', getSubmission]
  }, done)
}

Form.updateSubmission = ({id, user_id, state, values, path, deal, pdf}, cb) => {
  const getSubmission = cb => {
    Form.getSubmission(id, (err, submission) => {
      if (err)
        return cb(err)

      cb(null, submission)
    })
  }

  const getForm = (cb, results) => {
    Form.get(results.submission.form).nodeify(cb)
  }

  const insertData = (cb, results) => {
    db.query('form/data/insert', [
      user_id,
      results.form.id,
      results.submission.id,
      state,
      values,
      null
    ], cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    cb(null, results.saved)
  }

  const savePdf = (cb, results) => {
    saveRevisionPdf({
      form: results.form,
      values,
      revision: results.data.rows[0].id,
      user: results.user,
      path,
      deal,
      pdf
    }, cb)
  }

  async.auto({
    submission: getSubmission,
    form: ['submission', getForm],
    data: ['form', insertData],
    revision: ['data', (cb, results) => Form.getRevision(results.data.rows[0].id, cb)],
    user: cb => User.get(user_id).nodeify(cb),
    pdf: ['data', 'user', savePdf],
    saved: ['pdf', getSubmission]
  }, done)
}

Form.getSubmission = (id, cb) => {
  Form.getAllSubmissions([id], (err, submissions) => {
    if(err)
      return cb(err)

    if (submissions.length < 1)
      return cb(Error.ResourceNotFound(`Submission ${id} not found`))

    const submission = submissions[0]

    return cb(null, submission)
  })
}

Form.getAllSubmissions = (submission_ids, cb) => {
  db.query('form/submission/get', [submission_ids], (err, res) => {
    if (err)
      return cb(err)

    const submissions = res.rows

    return cb(null, submissions)
  })
}


Form.getRevision = (revision_id, cb) => {
  Form.getAllRevisions([
    revision_id
  ], (err, revs) => {
    if (err || revs.length < 1)
      return cb(Error.ResourceNotFound(`Submission revision ${revision_id} not found`))

    cb(null, revs[0])
  })
}

Form.getAllRevisions = (revisions, cb) => {
  db.query('form/submission/get_revision', [
    revisions
  ], (err, res) => {
    if (err)
      return cb(err)

    cb(null, res.rows)
  })
}


Submission.get = Form.getSubmission
Submission.getAll = Form.getAllSubmissions
