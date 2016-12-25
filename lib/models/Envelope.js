const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const async = require('async')
const config = require('../config.js')
const request = require('request')
const parser = new (require('xml2js').Parser)

Envelope = {}

Orm.register('envelope', Envelope)

EnvelopeRecipient = {}

Orm.register('envelope_recipient', EnvelopeRecipient)

const schema = {
  type: 'object',

  submissions: {
    type: 'array',
    uuid: true,
    required: false
  },

  created_by: {
    type: 'string',
    uuid: true,
    required: true
  }
}

const validate = validator.bind(null, schema)

const headers = {
  'X-DocuSign-Authentication': `{"Username": "${config.docusign.username}","Password": "${config.docusign.password}","IntegratorKey": "${config.docusign.integrator_key}"}`
}

Envelope.get = function (id, cb) {
  db.query('envelope/get', [id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Envelope ' + id + ' not found'))

    const envelope = res.rows[0]

    cb(null, envelope)
  })
}

const update = (data, cb) => {
  db.query('envelope/update', [
    data.docusign_id,
    data.status,
    data.title,
    data.id
  ], cb)
}

Envelope.create = function (envelope, cb) {
  const insert = cb => {
    db.query('envelope/insert', [
      envelope.created_by,
      envelope.deal
    ], cb)
  }

  const addRecipient = (envelope_id, rec, cb) => {
    db.query('envelope/recipient/add', [
      envelope_id,
      rec.user,
      rec.role
    ], (err, res) => {
      if (err)
        return cb(err)

      User.get(rec.user, (err, user) => {
        if (err)
          return cb(err)

        return cb(null, {
          id: res.rows[0].id,
          user,
          role: rec.role
        })
      })
    })
  }

  const addRecipients = (cb, results) => {
    async.map(envelope.recipients, addRecipient.bind(null, results.insert.rows[0].id), cb)
  }

  const getSubmissions = (cb, results) => {
    const submissions = envelope.documents
      .filter(doc => Boolean(doc.revision))
      .map(doc => doc.revision)

    async.map(submissions, Form.getRevision, cb)
  }

  const loadPdf = (rev, cb) => {
    const url = `${config.forms.url}/submissions/${rev.id}.pdf?token=${envelope.document_access_token}` //TODO: Security: Access token must go into header
    request({
      url,
      encoding: null
    }, (err, res, body) => {
      if (err)
        return cb(err)

      if (res.statusCode !== 200)
        return cb(Error.Internal('Error while fetching PDF file'))

      rev.pdf = body.toString('base64')
      cb()
    })
  }

  const loadPdfs = (cb, results) => {
    async.forEach(results.submissions, loadPdf, cb)
  }

  const loadForm = (rev, cb) => {
    Form.get(rev.form, (err, form) => {
      if (err)
        return cb(err)

      rev.form = form
      cb()
    })
  }

  const loadForms = (cb, results) => {
    async.forEach(results.submissions, loadForm, cb)
  }

  let documentId = 0
  const addDocument = (envelope_id, submission, cb) => {
    submission.document_id = ++documentId
    submission.document_name = submission.form.name + '.pdf'

    db.query('envelope/document/add', [
      envelope_id,
      submission.document_name,
      submission.document_id,
      submission.id
    ], cb)
  }

  const addDocuments = (cb, results) => {
    async.map(results.submissions, addDocument.bind(null, results.insert.rows[0].id) , cb)
  }

  const getTitle = (cb, results) => {
    if (envelope.title)
      return cb(null, envelope.title)

    cb(null, results.submissions.map(rev => rev.document_name).join(' and' ))
  }

  const docusign = (cb, results) => {
    const params = {
      url: `${config.docusign.baseurl}/envelopes`,
      headers,
      body: {
        emailSubject: `Please sign ${results.title}`,
        documents: [],
        status: 'sent',
        recipients: {
          signers: [

          ]
        },
        eventNotification: {
          url: Url.create({
            uri: `/envelopes/${results.insert.rows[0].id}/update`
          }),
          requireAcknowledgment: true,
          recipientEvents: [
            {recipientEventStatusCode: 'Sent'},
            {recipientEventStatusCode: 'Delivered'},
            {recipientEventStatusCode: 'Completed'},
            {recipientEventStatusCode: 'Declined'},
            {recipientEventStatusCode: 'AuthenticationFailed'},
            {recipientEventStatusCode: 'AutoResponded'}
          ]
        }
      },
      json: true
    }

    results.submissions.forEach((rev, i) => {
      const doc = {
        documentId: rev.document_id,
        name: rev.document_name,
        documentBase64: rev.pdf,
      }
      params.body.documents.push(doc)
    })

    results.recipients.forEach((recipient => {
      const u = recipient.user

      const signer = {
        email: u.email,
        name: `${u.display_name}`,
        recipientId: recipient.id,
        clientUserId: u.id === envelope.created_by ? u.id : null,
        tabs: {
          signHereTabs: []
        }
      }

      let tabs = 0

      results.submissions.forEach(rev => {
        const form = rev.form

        Object.keys(form.fields).forEach(field_name => {
          const field = form.fields[field_name]

          if (field.assigned_to !== recipient.role)
            return

          tabs++

          const tab = {
            documentId: rev.document_id,
            pageNumber: field.page,
            xPosition: parseInt(field.rect[0]),
            yPosition: parseInt(field.rect[1])
          }

          signer.tabs.signHereTabs.push(tab)
        })
      })

      if (tabs < 1) // Docusign will throw errors if there's an empty array for tabs
        delete signer.tabs.length

      params.body.recipients.signers.push(signer)
    }))

    request.post(params, (err, res, body) => {
      if (err)
        return cb(err)

      if (res.statusCode !== 201)
        return cb(Error.Generic('Error while creating docusign envelope'))

      cb(null, body)
    })
  }

  const updateEnvelope = (cb, results) => {
    update({
      id: results.insert.rows[0].id,
      docusign_id: results.docusign.envelopeId,
      status: results.docusign.status,
      title: results.title
    }, cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    Envelope.get(results.insert.rows[0].id, cb)
  }

  async.auto({
    validate: cb => validate(envelope, cb),
    insert: ['validate', insert],
    recipients: ['insert', addRecipients],
    submissions: getSubmissions,
    loadPdfs: ['submissions', loadPdfs],
    loadForms: ['submissions', loadForms],
    documents: ['submissions', 'loadForms', addDocuments],
    title: ['documents', getTitle],
    docusign: ['loadPdfs', 'insert', 'recipients', 'loadForms', 'documents', 'title', docusign],
    updateEnvelope: ['docusign', updateEnvelope],
  }, done)
}

Envelope.updateStatus = (id, xml, cb) => {
  const cleanup = (cb, results) => {
    const status = results.payload.DocuSignEnvelopeInformation.EnvelopeStatus[0]

    const data = {
      envelope_status: status.Status[0],
      recipients: []
    }

    data.recipients = status.RecipientStatuses.map(rs => {
      return {
        status: rs.RecipientStatus[0].Status[0],
        id: rs.RecipientStatus[0].RecipientId[0],
        signed_at: rs.RecipientStatus[0].Signed[0],
      }
    })

    cb(null, data)
  }

  const updateStatus = (cb, results) => {
    update({
      id: results.envelope.id,
      docusign_id: results.envelope.docusign_id,
      status: results.data.envelope_status,
      title: results.envelope.title
    }, cb)
  }

  const issueNotification = (envelope, user, recipient, cb) => {
    const notification = {}
    notification.action = 'ReactedTo'
    notification.object = envelope.id
    notification.object_class = 'Envelope'
    notification.subject = user.id
    notification.subject_class = 'User'
    notification.auxilary_subject = recipient.id
    notification.auxilary_subject_class = 'User'
    notification.message = `${user.abbreviated_display_name} ${recipient.status} your envelope.`

    Notification.issueForUser(notification, envelope.created_by, cb)
  }

  const updateRecipient = (envelope, recipient, cb) => {
    db.query('envelope/recipient/update', [
      recipient.id,
      recipient.status,
      recipient.signed_at
    ], (err, res) => {
      if (err)
        return cb(err)

      if (res.rows.length < 1)
        return cb(Error.Generic(`Cannot find recipient ${recipient.id} for envelope ${envelope.id}`))

      User.get(res.rows[0].user, (err, user) => {
        if (err)
          return cb(err)

        issueNotification(envelope, user, recipient, cb)
      })
    })
  }

  const updateRecipients = (cb, results) => {
    async.forEach(results.data.recipients, updateRecipient.bind(null, results.envelope), cb)
  }

  async.auto({
    envelope: cb => Envelope.get(id, cb),
    payload: cb => parser.parseString(xml, cb),
    data: ['envelope', 'payload', cleanup],
    status: ['data', updateStatus],
    recipients: ['data', updateRecipients]
  }, cb)
}

Envelope.getDocuments = (id, cb) => {
  Envelope.get(id, (err, envelope) => {
    if (err)
      return cb(err)

    const params = {
      url: `${config.docusign.baseurl}/envelopes/${envelope.docusign_id}/documents/combined`,
      headers,
      encoding: null
    }

    request(params, (err, res, body) => {
      if (err || res.statusCode !== 200)
        return cb(Error.Generic('Cannot get documents from Docusign'))

      cb(null, body)
    })
  })
}

Envelope.getRecipient = (envelope_id, user_id, cb) => {
  db.query('envelope/recipient/get-deal-user', [
    envelope_id,
    user_id
  ], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound(`Cannot find ${user_id} as a recepient of ${envelope_id}`))

    cb(null, res.rows[0])
  })
}

Envelope.getSignUrl = ({envelope_id, user}, cb) => {
  const getRecipient = cb => {
    Envelope.getRecipient(envelope_id, user.id, cb)
  }

  const getSignUrl = (cb, results) => {
    const params = {
      url: `${config.docusign.baseurl}/envelopes/${results.envelope.docusign_id}/views/recipient`,
      headers,
      body: {
        authenticationMethod: 'Email',
        clientUserId: user.id,
        email: user.email,
        recipientId: results.recipient.id,
        userName: user.display_name,
        returnUrl: Url.create('/envelopes/signed')
      },
      json: true
    }

    request.post(params, (err, res, body) => {
      if (err || res.statusCode !== 201)
        return cb(Error.Generic('Cannot get documents from Docusign'))

      cb(null, body.url)
    })
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    cb(null, results.url)
  }

  async.auto({
    envelope: cb => Envelope.get(envelope_id, cb),
    recipient: getRecipient,
    url: ['envelope', 'recipient', getSignUrl]
  }, done)
}

Envelope.getByDeal = (deal_id, cb) => {
  db.query('envelope/get-deal', [
    deal_id
  ], (err, res) => {
    if (err)
      return cb(err)

    async.map(res.rows.map(e => e.id), Envelope.get, cb)
  })
}

Envelope.associations = {
  recipients: {
    collection: true,
    model: 'EnvelopeRecipient'
  }
}

EnvelopeRecipient.get = (id, cb) => {
  db.query('envelope/recipient/get', [
    id
  ], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Envelope recipient' + id + ' not found'))

    cb(null, res.rows[0])
  })
}

EnvelopeRecipient.associations = {
  user: {
    enabled: false,
    model: 'User'
  }
}

module.exports = function () {}