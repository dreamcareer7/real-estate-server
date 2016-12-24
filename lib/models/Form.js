const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const config = require('../config.js')
const async = require('async')

const FS = require('formstack-web-api-node')
const fsa = new FS(config.formstack.access_token)

Form = {}

Orm.register('Form', Form)

const schema = {
  type: 'object',
  properties: {
    formstack_id: {
      required: true,
      type: 'number'
    },

    fields: {
      type: 'object'
    }
  }
}

const validate = validator.bind(null, schema)

Form.get = function (id, cb) {
  db.query('form/get', [id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Form ' + id + ' not found'))

    cb(null, res.rows[0])
  })
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
      form.fields
    ], (err, res) => {
      if (err)
        return cb(err)

      Form.get(id, cb)
    })
  })
}

Form.getAll = cb => {
  db.query('form/get-all', [], (err, res) => {
    if (err)
      return cb(err)

    async.map(res.rows.map(f => f.id), Form.get, cb)
  })
}

Form.submit = (deal_id, form_id, user_id, values, cb) => {
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
      deal_id,
      form_id,
      results.fsa.id
    ], cb)
  }

  const insertData = (cb, results) => {
    db.query('form/data/insert', [
      user_id,
      form_id,
      results.submission.rows[0].id,
      values,
      results.fsa
    ], cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    Form.getSubmission(results.submission.rows[0].id, cb)
  }

  async.auto({
    form: getForm,
    fsa: ['form', submitFsa],
    submission: ['form', 'fsa', createSubmission],
    data: ['submission', insertData]
  }, done)
}

Form.updateSubmission = (submission_id, user_id, values, cb) => {
  const getSubmission = cb => {
    Form.getSubmission(submission_id, (err, submission) => {
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
      values,
      results.fsa
    ], cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    Form.getSubmission(results.submission.id, cb)
  }

  async.auto({
    submission: getSubmission,
    form: ['submission', getForm],
    fsa: ['form', submitFsa],
    data: ['fsa', insertData]
  }, done)
}

Form.getSubmission = (id, cb) => {
  db.query('form/submission/get', [
    id
  ], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound(`Submission ${id} not found`))

    cb(null, res.rows[0])
  })
}

Form.getSubmissionsByDeal = (deal_id, cb) => {
  db.query('form/submission/deal', [
    deal_id
  ], (err, res) => {
    if (err)
      return cb(err)

    async.map(res.rows.map(s => s.id), Form.getSubmission, cb)
  })
}

Form.getRevision = (revision_id, cb) => {
  db.query('form/submission/get-revision', [
    revision_id
  ], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound(`Submission revision ${revision_id} not found`))

    cb(null, res.rows[0])
  })
}

module.exports = function () {}
