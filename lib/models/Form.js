const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const config = require('../config.js')
const async = require('async')
const EventEmitter = require('events').EventEmitter

const FS = require('formstack-web-api-node')
const fsa = new FS(config.formstack.access_token)

Form = new EventEmitter

Orm.register('Form', Form)

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

const Submission = {}
Submission.associations = {
  file: {
    model: 'AttachedFile'
  }
}

Orm.register('form_submission', Submission)

const validate = validator.bind(null, schema)

Form.get = function (id, cb) {
  db.query('form/get', [id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Form ' + id + ' not found'))

    const form = res.rows[0]

    extractRoles(form)

    cb(null, form)
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

Form.getAll = cb => {
  db.query('form/get_all', [], (err, res) => {
    if (err)
      return cb(err)

    async.map(res.rows.map(f => f.id), Form.get, cb)
  })
}

function validateData(fields, values, cb) {
  return cb()
//   const validated = fields.every(f => {
//     if (f.required !== '1')
//       return true
//
//     const provided = values[f.id]
//     if (!provided || provided.trim().length < 1) {
//       cb(Error.Validation(`Please provide ${f.label}`))
//       return false
//     }
//
//     return true
//   })
//
//   if(validated)
//     return cb()
}

const updateDeal = ({deal, fields, values}, cb) => {
  fields.forEach(field => {
    if (!field.default || !field.default.match)
      return

    const match = field.default.match(/\$\{([A-z]+)}/) // We try to match default value to ${close_date}
    if(!match)
      return

    const context = match[1] // context is close_date

    const value = values[field.id]

    if (!value) {
      deal.context[context] = null
      return
    }

    if (deal.proposed_values && value === deal.proposed_values[context]) {
      deal.context[context] = null
      return
    }

    deal.context[context] = value
  })

  Deal.update(deal, cb)
}

const saveSubmissionPdf = ({form, values, revision, deal, user, token}, cb) => {
  const url = {
    url: `${config.forms.url}/generate.pdf`,
    method: 'POST',
    json: true,
    body: {
      token,
      values,
      form,
      flat: true
    }
  }

  AttachedFile.saveFromUrl({
    bucket: 'deals',
    path: deal.id + '/revisions',
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

Form.submit = ({deal_id, form_id, user_id, state, values, token}, cb) => {
  const getForm = cb => {
    Form.get(form_id, cb)
  }

  const getFields = (cb, results) => {
    fsa.getFormDetails(results.form.formstack_id, (form, err) => {
      if (err)
        return cb(err)

      cb(null, form.fields)
    })
  }

  const validate = (cb, results) => {
    if (state === 'Draft')
      return cb()

    validateData(results.fields, values, cb)
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
      token,
      values,
      revision: results.data.rows[0].id,
      deal: results.deal,
      user: results.user
    }, cb)
  }

  const getDeal = cb => {
    Deal.get(deal_id, cb)
  }

  const deal = (cb, results) => {
    updateDeal({
      deal: results.deal,
      fields: results.fields,
      values
    }, cb)
  }

  async.auto({
    form: getForm,
    fields: ['form', getFields],
    validate: ['fields', validate],
    fsa: ['validate', 'form', submitFsa],
    submission: ['form', 'fsa', createSubmission],
    data: ['submission', insertData],
    user: cb => User.get(user_id, cb),
    pdf: ['data', 'deal', 'user', pdf],
    deal: ['data', getDeal],
    updateDeal: ['deal', 'data', deal]
  }, done)
}

Form.updateSubmission = ({submission_id, user_id, state, values, token}, cb) => {
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

  const getFields = (cb, results) => {
    fsa.getFormDetails(results.form.formstack_id, (form, err) => {
      if (err)
        return cb(err)

      cb(null, form.fields)
    })
  }

  const validate = (cb, results) => {
    if (state === 'Draft')
      return cb()

    validateData(results.fields, values, cb)
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

  const getDeal = (cb, results) => {
    Deal.get(results.submission.deal, cb)
  }

  const deal = (cb, results) => {
    updateDeal({
      deal: results.deal,
      fields: results.fields,
      values
    }, cb)
  }

  const pdf = (cb, results) => {
    saveSubmissionPdf({
      form: results.form,
      token,
      values,
      revision: results.data.rows[0].id,
      deal: results.deal,
      user: results.user
    }, cb)
  }

  async.auto({
    submission: getSubmission,
    form: ['submission', getForm],
    fields: ['form', getFields],
    validate: ['fields', validate],
    fsa: ['form', 'validate', submitFsa],
    data: ['fsa', insertData],
    deal: ['submission', 'data', getDeal],
    user: cb => User.get(user_id, cb),
    pdf: ['data', 'deal', 'user', pdf],
    updateDeal: ['deal', 'data', deal]
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

Form.deleteSubmission = (id, cb) => {
  async.auto({
    get: cb => {
      Form.getSubmission(id, cb)
    },
    delete: [
      'get',
      cb => {
        db.query('form/submission/delete', [id], cb)
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err)

    return cb()
  })
}

module.exports = function () {}
