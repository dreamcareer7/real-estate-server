const async = require('async')
const FS = require('formstack-web-api-node')
const config = require('../../config.js')
const db = require('../../utils/db.js')

const fsa = new FS(config.formstack.access_token)

Submission = {}

Submission.associations = {
  file: {
    model: 'AttachedFile'
  }
}

Orm.register('form_submission', 'Submission')

const saveSubmissionPdf = ({form, values, revision, user, path}, cb) => {
  const url = {
    url: `${config.forms.url}/generate.pdf`,
    method: 'POST',
    json: true,
    body: {
      values,
      form,
      flat: true
    }
  }

  AttachedFile.saveFromUrl({
    path,
    filename: form.name + '.pdf',
    url,
    user: user,
    relations: [
      {
        role: 'SubmissionRevision',
        id: revision
      }
    ]
  }, cb)
}

Form.submit = ({form_id, user_id, state, values, path}, cb) => {
  const getForm = cb => {
    Form.get(form_id, cb)
  }

  const submitFsa = (cb, results) => {
    const params = {
      fieldIds: [],
      fieldValues: []
    }

    Object.keys(values).forEach((fieldId, index) => {
      params.fieldIds.push(fieldId)
      params.fieldValues.push(values[fieldId])
    })

    fsa.submitForm(results.form.formstack_id, params, (data, err) => {
      // The FSA npm package is weird and backwards
      cb(err, data)
    })
  }

  const createSubmission = (cb, results) => {
    db.query('form/submission/insert', [
      form_id,
      results.fsa.id
    ], cb)
  }

  const insertData = (cb, results) => {
    db.query('form/data/insert', [
      user_id,
      form_id,
      results.submission.rows[0].id,
      state,
      values,
      results.fsa
    ], cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    Form.getSubmission(results.submission.rows[0].id, (err, submission) => {
      if (err)
        return cb(err)

      Form.emit('submission created', submission)
      cb(err, submission)
    })
  }

  const pdf = (cb, results) => {
    saveSubmissionPdf({
      form: results.form,
      values,
      revision: results.data.rows[0].id,
      user: results.user,
      path
    }, cb)
  }

  async.auto({
    form: getForm,
    fsa: ['form', submitFsa],
    submission: ['form', 'fsa', createSubmission],
    data: ['submission', insertData],
    user: cb => User.get(user_id, cb),
    pdf: ['data', 'user', pdf]
  }, done)
}

Form.updateSubmission = ({id, user_id, state, values, path}, cb) => {
  const getSubmission = cb => {
    Form.getSubmission(id, (err, submission) => {
      if (err)
        return cb(err)

      if (submission.author !== user_id)
        return cb(Error.AccessForbidden())

      cb(null, submission)
    })
  }

  const getForm = (cb, results) => {
    Form.get(results.submission.form, cb)
  }

  const submitFsa = (cb, results) => {
    const params = {
      fieldIds: [],
      fieldValues: []
    }

    Object.keys(values).forEach((fieldId, index) => {
      params.fieldIds.push(fieldId)
      params.fieldValues.push(values[fieldId])
    })

    fsa.editSubmissionData(results.submission.formstack_id, params, (data, err) => {
      // The FSA npm package is weird and backwards
      cb(err, data)
    })
  }

  const insertData = (cb, results) => {
    db.query('form/data/insert', [
      user_id,
      results.form.id,
      results.submission.id,
      state,
      values,
      results.fsa
    ], cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    Form.getSubmission(results.submission.id, cb)
  }

  const pdf = (cb, results) => {
    saveSubmissionPdf({
      form: results.form,
      values,
      revision: results.data.rows[0].id,
      user: results.user,
      path
    }, cb)
  }

  async.auto({
    submission: getSubmission,
    form: ['submission', getForm],
    fsa: ['form', submitFsa],
    data: ['fsa', insertData],
    user: cb => User.get(user_id, cb),
    pdf: ['data', 'user', pdf]
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
  db.query('form/submission/get_revision', [
    revision_id
  ], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound(`Submission revision ${revision_id} not found`))

    cb(null, res.rows[0])
  })
}

Form.extractContextFromSubmission = (submission, cb) => {
  const getForm = cb => Form.get(submission.form_id, cb)

  const getFields = (cb, results) => {
    fsa.getFormDetails(results.form.formstack_id, (form, err) => {
      if (err)
        return cb(err)

      cb(null, form.fields)
    })
  }

  const extract = (cb, results) => {
    const context = {}
    const values = submission.values

    results.fields.forEach(field => {
      if (!field.default || !field.default.match)
        return

      const match = field.default.match(/\$\{([A-z]+)}/) // We try to match default value to ${close_date}
      if(!match)
        return

      const name = match[1] // name is close_date

      if (!values[field.id])
        values[field.id] = null

      context[name] = values[field.id]
    })

    cb(null, context)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    cb(null, results.extract)
  }

  async.auto({
    form: getForm,
    fields: ['form', getFields],
    extract: ['fields', extract]
  }, done)
}

Submission.get = Form.getSubmission
