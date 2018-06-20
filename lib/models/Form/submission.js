const async = require('async')
const FS = require('formstack-web-api-node')
const config = require('../../config.js')
const db = require('../../utils/db.js')
const Orm = require('../Orm')
const AttachedFile = require('../AttachedFile')

const fsa = new FS(config.formstack.access_token)

Submission = {}

Submission.associations = {
  file: {
    model: 'AttachedFile'
  }
}

Orm.register('form_submission', 'Submission')

const saveRevisionPdf = ({form, values, revision, user, deal, path}, cb) => {
  const url = {
    url: `${config.forms.url}/generate.pdf`,
    method: 'POST',
    json: true,
    body: {
      values,
      form,
      deal,
      flat: false
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

Form.submit = ({form_id, user_id, state, values, path, deal, pdf = true}, cb) => {
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
      results.create.rows[0].id,
      state,
      values,
      results.fsa
    ], cb)
  }

  const getSubmission = (cb, results) => {
    Form.getSubmission(results.create.rows[0].id, cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    Form.emit('submission created', results.saved)
    cb(err, {
      submission: results.saved,
      context: results.context
    })
  }

  const savePdf = (cb, results) => {
    if (!pdf)
      return cb()

    saveRevisionPdf({
      form: results.form,
      values,
      revision: results.data.rows[0].id,
      user: results.user,
      path,
      deal
    }, cb)
  }

  const context = (cb, results) => {
    Submission.saveContext({
      form: results.form,
      revision: results.revision
    }, cb)
  }

  async.auto({
    form: getForm,
    fsa: ['form', submitFsa],
    create: ['form', 'fsa', createSubmission],
    data: ['create', insertData],
    revision: ['data', (cb, results) => Form.getRevision(results.data.rows[0].id, cb)],
    context: ['revision', context],
    user: cb => User.get(user_id, cb),
    pdf: ['data', 'user', savePdf],
    saved: ['pdf', getSubmission]
  }, done)
}

Form.updateSubmission = ({id, user_id, state, values, path, deal, pdf = true}, cb) => {
  const getSubmission = cb => {
    Form.getSubmission(id, (err, submission) => {
      if (err)
        return cb(err)

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

    cb(null, {
      submission: results.saved,
      context: results.context
    })
  }

  const savePdf = (cb, results) => {
    if (!pdf)
      return cb()

    saveRevisionPdf({
      form: results.form,
      values,
      revision: results.data.rows[0].id,
      user: results.user,
      path,
      deal
    }, cb)
  }

  const context = (cb, results) => {
    Submission.saveContext({
      form: results.form,
      revision: results.revision
    }, cb)
  }

  async.auto({
    submission: getSubmission,
    form: ['submission', getForm],
    fsa: ['form', submitFsa],
    data: ['fsa', insertData],
    revision: ['data', (cb, results) => Form.getRevision(results.data.rows[0].id, cb)],
    context: ['revision', context],
    user: cb => User.get(user_id, cb),
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

Submission.saveContext = ({revision, form}, cb) => {

  const getFields = cb => {
    fsa.getFormDetails(form.formstack_id, (form, err) => {
      if (err)
        return cb(err)

      cb(null, form.fields)
    })
  }

  const extract = (cb, results) => {
    const context = {}
    const values = revision.values

    results.fields.forEach(field => {
      if (!field.default || !field.default.match)
        return

      const match = field.default.match(/\$\{([A-z]+)}/) // We try to match default value to ${close_date}
      if(!match)
        return

      const name = match[1] // name is close_date

      /*
       * If no value was provided, dont save it.
       * It serves two purposes:
       * 1. Dont pollute the context with empty values
       * 2. If nothing was provided, we should still use the previous context values.
       *    But if we write null to it, null will override previous values. Also see #841
       */
      if (!values[field.id])
        return

      context[name] = values[field.id]
    })

    cb(null, context)
  }

  const insert = ({key, value, revision}, cb) => {
    db.query('form/context/insert', [
      key,
      value,
      revision.id
    ], cb)
  }

  const save = (cb, results) => {
    if (!results.context)
      return cb()

    const keys = Object.keys(results.context)
    async.forEach(keys, (key, cb) => {
      insert({
        key,
        revision,
        value: results.context[key]
      }, cb)
    }, cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    cb(null, results.context)
  }

  async.auto({
    fields: getFields,
    context: ['fields', extract],
    save: ['context', save]
  }, done)
}

Submission.get = Form.getSubmission
Submission.getAll = Form.getAllSubmissions
