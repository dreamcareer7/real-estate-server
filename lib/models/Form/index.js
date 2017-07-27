const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const config = require('../../config.js')
const async = require('async')
const EventEmitter = require('events').EventEmitter

const FS = require('formstack-web-api-node')
const fsa = new FS(config.formstack.access_token)

if (process.env.NODE_ENV === 'tests')
  require('./mock.js')


Form = new EventEmitter

Orm.register('form', 'Form')

const schema = {
  type: 'object',
  properties: {
    formstack_id: {
      required: true,
      type: 'number'
    },
    name: {
      type: 'string'
    },
    fields: {
      type: 'object'
    }
  }
}

Submission = {}

Submission.associations = {
  file: {
    model: 'AttachedFile'
  }
}

Orm.register('form_submission', 'Submission')

const validate = validator.bind(null, schema)

Form.get = function (id, cb) {
  Form.getAll([id], (err, forms) => {
    if(err)
      return cb(err)

    if (forms.length < 1)
      return cb(Error.ResourceNotFound('Form ' + id + ' not found'))

    const form = forms[0]

    return cb(null, form)
  })
}

Form.getAll = function(form_ids, cb) {
  db.query('form/get', [form_ids], (err, res) => {
    if (err)
      return cb(err)

    const forms = res.rows.map(r => {
      extractRoles(r)
      return r
    })

    return cb(null, forms)
  })
}

Form.getAllForms = function(cb) {
  db.query('form/get_all', [], (err, res) => {
    if (err)
      return cb(err)

    const form_ids = res.rows.map(r => r.id)

    Form.getAll(form_ids, cb)
  })
}

function extractRoles(form) {
  const roles = {}

  if (!form.fields)
    return

  Object.keys(form.fields).forEach(name => {
    const field = form.fields[name]

    if (field.type !== 'role')
      return

    if (!field.assigns || !field.assigns.roles)
      return

    Object.keys(field.assigns.roles).forEach(role => {
      const num = field.assigns.roles[role]

      if (!roles[role])
        roles[role] = {
          type: 'form_role',
          role: role,
          max_count: 0
        }

      if (num > roles[role].max_count)
        roles[role].max_count = num
    })
  })

  form.roles = Object.keys(roles).map(role_name => roles[role_name])
}

Form.getByFormstackId = function (formstack_id, cb) {
  db.query('form/get_formstack', [formstack_id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Form with formstack id ' + formstack_id + ' not found'))

    Form.get(res.rows[0].id, cb)
  })
}

Form.create = function (form, cb) {
  validate(form, function (err) {
    if (err)
      return cb(err)

    db.query('form/insert', [
      form.formstack_id,
      form.name,
      form.fields
    ], (err, res) => {
      if (err)
        return cb(err)

      Form.get(res.rows[0].id, cb)
    })
  })
}

Form.update = function (id, form, cb) {
  validate(form, function (err) {
    if (err)
      return cb(err)

    db.query('form/update', [
      id,
      form.name,
      form.fields
    ], (err, res) => {
      if (err)
        return cb(err)

      Form.get(id, cb)
    })
  })
}

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


module.exports = function () {}
