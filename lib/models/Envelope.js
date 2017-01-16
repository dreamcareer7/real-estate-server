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
  'X-DocuSign-Authentication': JSON.stringify({
    'Username': config.docusign.username,
    'Password': config.docusign.password,
    'IntegratorKey': config.docusign.integrator_key
  })
}

Envelope.get = function (id, cb) {
  db.query('envelope/get', [id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(Error.ResourceNotFound('Envelope ' + id + ' not found'))

    const envelope = res.rows[0]

    proposeTitle(envelope)

    if (envelope.documents)
      envelope.documents.forEach(d => {
        d.type = 'envelope_document'
      })

    cb(null, envelope)
  })
}

function proposeTitle(envelope) {
  envelope.proposed_title = envelope.documents ? envelope.documents.map(d => d.title).join(' and ') : 'Untitled'
}

const update = (data, cb) => {
  db.query('envelope/update', [
    data.docusign_id,
    data.status,
    data.title,
    data.id
  ], cb)
}

function upsertDocusignUser(user_id, cb) {
  const get = cb => {
    db.query('envelope/user/get', [user_id], (err, res) => {
      if (err)
        return cb(err)

      if (res.rows.length < 1)
        return create(cb)

      cb(null, res.rows[0])
    })
  }

  const create = cb => {
    const params = {
      url: `${config.docusign.baseurl}/users`,
      headers,
      json: true,
      body: {
        newUsers: [{
          email: null,
          firstName: null,
          lastName: null,
          userStatus: 'Active',
          userSettings: [
            {
              name: 'canSendEnvelope',
              value: true
            },
            {
              name: 'allowEmailChange',
              value: true
            }
          ]
        }]
      }
    }

    User.get(user_id, (err, user) => {
      if (err)
        return cb(err)

      params.body.newUsers[0].email = user.email
      params.body.newUsers[0].userName = user.email
      params.body.newUsers[0].firstName = user.first_name
      params.body.newUsers[0].lastName = user.last_name


      request.post(params, (err, res, body) => {
        if (err || res.statusCode !== 201)
          return cb(Error.Generic('Cannot register user'))

        db.query('envelope/user/insert', [
          user_id,
          body.newUsers[0].userId
        ], err => {
          if (err)
            return cb(err)

          get(cb)
        })
      })
    })
  }

  get(cb)
}


const permissionError = Error.create.bind(null, {
  http: 401,
  message: 'User doesnt have permission to send envelopes',
  code: 'AccessDenied'
})


Envelope.create = function (envelope, cb) {
  const insert = cb => {
    db.query('envelope/insert', [
      envelope.created_by,
      envelope.deal
    ], cb)
  }

  const getDocusignUser = cb => upsertDocusignUser(envelope.created_by, cb)

  const getRecipientUser = (recipient, cb) => {
    if (recipient.user) {
      User.get(recipient.user, cb)
      return
    }

    if (recipient.email) {
      User.getOrCreateByEmail(recipient.email, {
        first_name: recipient.first_name,
        last_name: recipient.last_name
      }, cb)
      return
    }

    cb(Error.Validation('Please provide either email or user'))
  }

  const addRecipient = (envelope_id, rec, cb) => {
    getRecipientUser(rec, (err, user) => {
      if (err)
        return cb(err)

      db.query('envelope/recipient/add', [
        envelope_id,
        user.id,
        rec.role
      ], (err, res) => {
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

  const getRevision = (revision_id, cb) => {
    Form.getRevision(revision_id, (err, revision) => {
      if (err)
        return cb(err)

      if (revision.state !== 'Fair')
        return cb(Error.Validation('Only fair documents can be added to an envelope'))

      cb(null, revision)
    })
  }

  const getSubmissions = (cb, results) => {
    const submissions = envelope.documents
      .filter(doc => Boolean(doc.revision)) //Filter the documents that are not rechat revisions. We have to support them later though.
      .map(doc => doc.revision)

    async.map(submissions, getRevision, cb)
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
        return cb(Error.Generic('Error while fetching PDF file'))

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
    const subject = `Please sign ${results.title}`
    const body = `TODO: ${results.user.display_name} wants you to sign ${results.submissions.map(rev => rev.document_name).join(',')}`

    const params = {
      url: `${config.docusign.baseurl}/envelopes`,
      headers: {
        'X-DocuSign-Authentication': JSON.stringify({
          'Username': config.docusign.username,
          'Password': config.docusign.password,
          'IntegratorKey': config.docusign.integrator_key,
          'SendOnBehalfOf': results.user.email
        })
      },
      body: {
        emailSubject: subject,
        emailBlurb: body,
        emailSettings: {
          replyEmailAddressOverride: results.user.email,
          replyEmailNameOverride: results.user.display_name
        },
        documents: [],
        status: 'sent',
        recipients: {
          signers: [

          ]
        },
        eventNotification: {
          url: Url.api({
            uri: `/envelopes/${results.insert.rows[0].id}/hook`,
            query: {
              token: results.insert.rows[0].webhook_token
            }
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

    const roles_counts = {}

    results.recipients.forEach((recipient => {
      const u = recipient.user

      if (!roles_counts[recipient.role])
        roles_counts[recipient.role] = 0

      roles_counts[recipient.role]++

      const signer = {
        email: u.email,
        name: `${u.display_name}`,
        recipientId: recipient.id,
        customFields: [recipient.id],
        clientUserId: u.id === envelope.created_by ? u.id : null,
        tabs: {
          signHereTabs: [],
          dateSignedTabs: [],
          initialHereTabs: []
        }
      }

      results.submissions.forEach(rev => {
        const form = rev.form

        Object.keys(form.fields).forEach(field_name => {
          const field = form.fields[field_name]

          if (field.type !== 'role')
            return

          if (!field.assigns.roles[recipient.role])
            return

          if (parseInt(field.assigns.roles[recipient.role]) !== parseInt(roles_counts[recipient.role]))
            return

          const rect = field.rect.split(',')

          const tab = {
            documentId: rev.document_id,
            pageNumber: field.page,
            xPosition: parseInt(rect[0]),
            yPosition: parseInt(rect[1])
          }

          if (field.assigns.type === 'Signature')
            signer.tabs.signHereTabs.push(tab)

          if (field.assigns.type === 'Date')
            signer.tabs.dateSignedTabs.push(tab)

          if (field.assigns.type === 'Initials')
            signer.tabs.initialHereTabs.push(tab)
        })
      })

      if (signer.tabs.signHereTabs.length < 1)
        delete signer.tabs.signHereTabs

      if (signer.tabs.dateSignedTabs.length < 1)
        delete signer.tabs.dateSignedTabs

      if (signer.tabs.initialHereTabs.length < 1)
        delete signer.tabs.initialHereTabs

      params.body.recipients.signers.push(signer)
    }))

    request.post(params, (err, res, body) => {
      if (err)
        return cb(err)

      if (res.statusCode === 401)
        return cb(permissionError())

      if (res.statusCode !== 201)
        return cb(Error.Generic('Error while creating docusign envelope', body))

      cb(null, body)
    })
  }

  const updateEnvelope = (cb, results) => {
    update({
      id: results.insert.rows[0].id,
      docusign_id: results.docusign.envelopeId,
      status: results.docusign.status,
      title: envelope.title
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
    user: cb => User.get(envelope.created_by, cb),
    docusign_user: getDocusignUser,
    docusign: ['loadPdfs', 'insert', 'recipients', 'loadForms', 'documents', 'title', 'user', 'docusign_user', docusign],
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
        id: rs.RecipientStatus[0].CustomFields[0].CustomField[0],
        signed_at: rs.RecipientStatus[0].Signed ? rs.RecipientStatus[0].Signed[0] : null,
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
    notification.auxiliary_subject = recipient.id
    notification.auxiliary_subject_class = 'EnvelopeRecipient'
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

Envelope.getDocuments = (id, doc, cb) => {
  Envelope.get(id, (err, envelope) => {
    if (err)
      return cb(err)

    const params = {
      url: `${config.docusign.baseurl}/envelopes/${envelope.docusign_id}/documents/${doc}`,
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
  db.query('envelope/recipient/get_deal_user', [
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
        returnUrl: Url.api('/envelopes/signed') //TODO
      },
      json: true
    }

    request.post(params, (err, res, body) => {
      if (err || res.statusCode !== 201)
        return cb(Error.Generic('Cannot get sign url from Docusign'))

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
  db.query('envelope/get_deal', [
    deal_id
  ], (err, res) => {
    if (err)
      return cb(err)

    async.map(res.rows.map(e => e.id), Envelope.get, cb)
  })
}


Envelope.void = (envelope_id, cb) => {
  const get = cb => Envelope.get(envelope_id, cb)

  const void_envelope = (cb, results) => {
    const params = {
      url: `${config.docusign.baseurl}/envelopes/${results.get.docusign_id}`,
      headers,
      body: {
        status: 'voided',
        voidedReason: 'Envelope voided'
      },
      json: true
    }

    request.put(params, (err, res, body) => {
      if (err)
        return cb(err)

      if (res.statusCode !== 200)
        return cb(Error.Generic('Error while voiding envelope'))

      return cb()
    })
  }

  const update = cb => {
    db.query('envelope/void', [envelope_id], cb)
  }

  const done = (err) => {
    if (err)
      return cb(err)

    Envelope.get(envelope_id, cb)
  }

  async.auto({
    get,
    void_envelope: ['get', void_envelope],
    update: ['void_envelope', update]
  }, done)
}

Envelope.resend = (envelope_id, cb) => {
  const get = cb => Envelope.get(envelope_id, cb)

  const resend = (cb, results) => {
    const params = {
      url: `${config.docusign.baseurl}/envelopes/${results.get.docusign_id}`,
      headers,
      body: {},
      qs: {
        resend_envelope: true
      },
      json: true
    }

    request.put(params, (err, res, body) => {
      if (err)
        return cb(err)

      if (res.statusCode !== 200)
        return cb(Error.Generic('Error while resending envelope'))

      return cb()
    })
  }

  const done = (err) => {
    if (err)
      return cb(err)

    Envelope.get(envelope_id, cb)
  }

  async.auto({
    get,
    resend: ['get', resend],
  }, done)
}
Envelope.associations = {
  recipients: {
    collection: true,
    model: 'EnvelopeRecipient'
  }
}

Envelope.publicize = (envelope) => {
  delete envelope.webhook_token
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
    enabled: true,
    model: 'User'
  }
}

module.exports = function () {}
