const db = require('../../utils/db.js')
const validator = require('../../utils/validator.js')
const async = require('async')
const config = require('../../config.js')
const parser = new (require('xml2js').Parser)
const EventEmitter = require('events').EventEmitter
const request = require('request')

if (process.env.NODE_ENV === 'tests')
  require('../../../tests/suites/envelope/mock.js')

Envelope = new EventEmitter

Orm.register('envelope', 'Envelope')

EnvelopeRecipient = {}

Orm.register('envelope_recipient', 'EnvelopeRecipient')

const schema = {
  type: 'object',

  title: {
    type: 'string',
    required: true
  },

  body: {
    type: ['string', 'null'],
    required: false
  },

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
//   'X-DocuSign-Authentication': JSON.stringify({
//     'IntegratorKey': config.docusign.integrator_key
//   })
}

const fixStatus = status => {
  return (status.charAt(0).toUpperCase() + status.slice(1))
}

Envelope.get = function (id, cb) {
  Envelope.getAll([id], (err, envelopes) => {
    if(err)
      return cb(err)

    if (envelopes.length < 1)
      return cb(Error.ResourceNotFound('Envelope ' + id + ' not found'))

    const envelope = envelopes[0]

    cb(null, envelope)
  })
}

Envelope.getAll = function(envelope_ids, cb) {
  db.query('envelope/get', [envelope_ids], (err, res) => {
    if (err)
      return cb(err)

    const envelopes = res.rows.map(r => {
      if (r.documents) {
        r.documents.forEach(d => {
          d.type = 'envelope_document'
        })
      }

      return r
    })

    return cb(null, envelopes)
  })
}

const update = (data, cb) => {
  db.query('envelope/update', [
    data.docusign_id,
    fixStatus(data.status),
    data.title,
    data.id
  ], cb)
}

const permissionError = Error.create.bind(null, {
  http: 412,
  message: 'Invalid docusign authorization',
  code: 'DocusignAuthenticationRequired'
})

const getUserInfo = (user_id, cb) => {
  db.query('envelope/user/get', [user_id], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(permissionError())

    cb(null, res.rows[0])
  })
}

const fetchTokens = (form, cb) => {
  const auth = config.docusign.integrator_key + ':' + config.docusign.secret_key

  const headers = {
    Authorization: 'Basic ' + (new Buffer(auth).toString('base64'))
  }

  const params = {
    uri: `${config.docusign.baseurl}/oauth/token`,
    method: 'POST',
    headers,
    form,
    json: true
  }

  request(params, (err, res, body) => {
    if (err || res.statusCode !== 200)
      return cb(Error.Generic(err || body))

    cb(null, body)
  })
}

const getLoginInfo = (user_id, token, cb) => {
  const headers = {
    Authorization: 'Bearer ' + token
  }
  const params = {
    uri: `${config.docusign.baseurl}/oauth/userinfo`,
    headers,
    json: true
  }

  request(params, (err, res, body) => {
    if (err || res.statusCode !== 200)
      return cb(Error.Generic(err || body))

    cb(null, body)
  })
}

const saveUser = ({user_id, access_token, refresh_token, account_id, base_url}, cb) => {
  db.query('envelope/user/insert', [
    user_id,
    access_token,
    refresh_token,
    account_id,
    base_url,
  ], cb)
}

Envelope.saveUserInfo = (user_id, code, cb) => {
  fetchTokens({
    code,
    grant_type: 'authorization_code'
  }, (err, tokens) => {
    if (err)
      return cb(err)

    getLoginInfo(user_id, tokens.access_token, (err, info) => {
      if (err)
        return cb(err)

      saveUser({
        user_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        account_id: info.accounts[0].account_id,
        base_url: info.accounts[0].base_uri,
      }, cb)
    })
  })
}

const docusignRequest = (user_id, r, cb) => {
  getUserInfo(user_id, (err, info) => {

    const refreshTokenAndRetry = () => {
      fetchTokens({
        grant_type: 'refresh_token',
        refresh_token: info.refresh_token
      }, (err, tokens) => {
        if (err)
          return cb(permissionError())

        saveUser({
          user_id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          account_id: info.account_id,
          base_url: info.base_url,
        }, err => {
          if (err)
            return cb(err)

          r.headers.Authorization = 'Bearer ' + tokens.access_token

          request(r, (err, res, body) => { //Retry with the newly acquired token.
            if (res.statusCode >= 400 && res.statusCode <= 499) {
              return cb(Error.BadRequest({
                message: body.message
              }))
            }

            cb(err, res, body)
          })
        })
      })
    }

    if (err)
      return cb(err)

    r.uri = `${info.base_url}/restapi/v2/accounts/${info.account_id}${r.uri}`

    if (!r.headers)
      r.headers = {}

    r.headers.Authorization = 'Bearer ' + info.access_token

    request(r, (err, res, body) => {
      if (err)
        return cb(err)

      // If its a 401, we should refresh the token and try again.
      // Otherwise, none of this wrapper's business
      if (res.statusCode === 401)
        return refreshTokenAndRetry()

      if (res.statusCode >= 400 && res.statusCode <= 499) {
        return cb(Error.BadRequest({
          message: body.message
        }))
      }

      return cb(err, res, body)
    })
  })
}

Envelope.create = function (envelope, cb) {
  const insert = cb => {
    db.query('envelope/insert', [
      envelope.created_by,
      envelope.deal
    ], cb)
  }

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
    AttachedFile.download(rev.file, (err, buffer) => {
      if (err)
        return cb(err)

      rev.pdf = buffer.toString('base64')
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

  const docusign = (cb, results) => {
    const params = {
      method: 'POST',
      uri: '/envelopes',
      body: {
        emailSubject: envelope.title,
//         emailBlurb: // Optional,
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

    if (envelope.body)
      params.body.emailBlurb = envelope.body

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

          if (!field.assigns || !field.assigns.roles)
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

          // These magic numbers are offsets specific to SignatureHere and InitialsHere tabs
          // Found them here http://stackoverflow.com/questions/24170573/absolute-coordinate-positioning-of-signhere-tabs

          if (field.assigns.type === 'Signature') {
            tab.yPosition -= 21
            signer.tabs.signHereTabs.push(tab)
          }

          if (field.assigns.type === 'Date')
            signer.tabs.dateSignedTabs.push(tab)

          if (field.assigns.type === 'Initials') {
            tab.yPosition -= 16
            signer.tabs.initialHereTabs.push(tab)
          }
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

    docusignRequest(envelope.created_by, params, (err, res, body) => {
      if (err)
        return cb(err)

      if (res.statusCode !== 201) {
        return cb(Error.Generic(body))
      }

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

  const saveRoles = (cb, results) => {
    const saveRecipientAsRole = (recipient, cb) => {
      Deal.addRole({
        user: recipient.user.id,
        deal: envelope.deal,
        role: recipient.role,
        created_by: envelope.created_by
      }, cb)
    }

    async.forEach(results.recipients, saveRecipientAsRole, cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    Envelope.emit('envelope created', results.insert.rows[0])
    Envelope.get(results.insert.rows[0].id, cb)
  }

  async.auto({
    // To make sure that there _is_ an access token, we fetvh the token first.
    // If there isnt, we stop the process right here and ask user to authenticate.
    token: cb => getUserInfo(envelope.created_by, cb),

    validate: cb => validate(envelope, cb),
    insert: ['validate', 'token', insert],
    recipients: ['insert', addRecipients],
    submissions: ['token', getSubmissions],
    loadPdfs: ['submissions', loadPdfs],
    loadForms: ['submissions', loadForms],
    documents: ['submissions', 'loadForms', 'insert', addDocuments],
    user: cb => User.get(envelope.created_by, cb),
    docusign: ['loadPdfs', 'insert', 'recipients', 'loadForms', 'documents', 'user', docusign],
    updateEnvelope: ['docusign', updateEnvelope],
    deal: cb => Deal.get(envelope.deal, cb),
    saveRoles: ['recipients', saveRoles]
  }, done)
}

const updateRecipient = (envelope, recipient, cb) => {
  const issueNotification = (envelope, user, recipient, cb) => {
    if (user.id === envelope.created_by)
      return cb() // Dont send me a notification that I just signed the doc.

    Envelope.emit('envelope recipient updated', {
      recipient,
      envelope
    })

    const notification = {}
    notification.action = 'ReactedTo'
    notification.object = envelope.id
    notification.object_class = 'Envelope'
    notification.subject = user.id
    notification.subject_class = 'User'
    notification.auxiliary_subject = recipient.id
    notification.auxiliary_subject_class = 'EnvelopeRecipient'
    notification.message = `${user.abbreviated_display_name} ${recipient.status} your documents.`

    Notification.issueForUser(notification, envelope.created_by, cb)
  }

  EnvelopeRecipient.get(recipient.id, (err, old) => {
    if (err)
      return cb(err)

    if (old.status === fixStatus(recipient.status))
      return cb()

    db.query('envelope/recipient/update', [
      recipient.id,
      fixStatus(recipient.status),
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
  })
}

Envelope.updateStatus = (id, xml, cb) => {
  const cleanup = (cb, results) => {
    const status = results.payload.DocuSignEnvelopeInformation.EnvelopeStatus[0]

    const data = {
      envelope_status: status.Status[0],
      recipients: []
    }

    data.recipients = status.RecipientStatuses[0].RecipientStatus.map(rs => {
      return {
        status: rs.Status[0],
        id: rs.CustomFields[0].CustomField[0],
        signed_at: rs.Signed ? rs.Signed[0] : null,
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

Envelope.update = (id, cb) => {
  const updateRecipients = (cb, results) => {
    const params = {
      uri: `/envelopes/${results.envelope.docusign_id}/recipients`,
      headers,
      json: true
    }

    docusignRequest(results.envelope.created_by, params, (err, res, body) => {
      if (err)
        return cb(err)

      if (res.statusCode !== 200)
        return cb(Error.Generic(body))

      const recipients = body.signers.map(signer => {
        return {
          id: signer.customFields[0],
          status: signer.status,
          signed_at: signer.signedDateTime || null
        }
      })

      async.forEach(recipients, updateRecipient.bind(null, results.envelope), cb)
    })
  }

  const updateEnvelope = (cb, results) => {
    const params = {
      uri: `/envelopes/${results.envelope.docusign_id}`,
      headers,
      json: true
    }

    docusignRequest(results.envelope.created_by, params, (err, res, body) => {
      if (err)
        return cb(err)

      if (res.statusCode !== 200)
        return cb(Error.Generic(body))

      update({
        id: results.envelope.id,
        docusign_id: results.envelope.docusign_id,
        status: body.status,
        title: results.envelope.title
      }, cb)
    })
  }

  async.auto({
    envelope: cb => Envelope.get(id, cb),
    updateRecipients: ['envelope', updateRecipients],
    updateEnvelope: ['envelope', updateEnvelope]
  }, cb)
}

Envelope.getDocuments = (id, doc, cb) => {
  Envelope.get(id, (err, envelope) => {
    if (err)
      return cb(err)

    const params = {
      uri: `/envelopes/${envelope.docusign_id}/documents/${doc}`,
      headers,
      encoding: null
    }

    docusignRequest(envelope.created_by, params, (err, res, body) => {
      if (err || res.statusCode !== 200)
        return cb(Error.Generic(err || body.toString()))

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
      return cb(Error.ResourceNotFound(`Cannot find ${user_id} as a recipient of ${envelope_id}`))

    cb(null, res.rows[0])
  })
}

Envelope.getSignUrl = ({envelope_id, user}, cb) => {
  const getRecipient = cb => {
    Envelope.getRecipient(envelope_id, user.id, cb)
  }

  const getSignUrl = (cb, results) => {
    const params = {
      uri: `/envelopes/${results.envelope.docusign_id}/views/recipient`,
      headers,
      method: 'POST',
      body: {
        authenticationMethod: 'Email',
        clientUserId: user.id,
        email: user.email,
        recipientId: results.recipient.id,
        userName: user.display_name,

        returnUrl: Url.api({
          uri: `/envelopes/${envelope_id}/signed`,
          query: {
            token: results.envelope.webhook_token
          }
        })
      },
      json: true
    }

    docusignRequest(results.envelope.created_by, params, (err, res, body) => {
      if (err || res.statusCode !== 201)
        return cb(Error.Generic(err || body))

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

    Envelope.getAll(res.rows.map(e => e.id), cb)
  })
}


Envelope.void = (envelope_id, cb) => {
  const get = cb => Envelope.get(envelope_id, cb)

  const void_envelope = (cb, results) => {
    const params = {
      uri: `/envelopes/${results.get.docusign_id}`,
      headers,
      method: 'PUT',
      body: {
        status: 'voided',
        voidedReason: 'Envelope voided'
      },
      json: true
    }

    docusignRequest(results.get.created_by, params, (err, res, body) => {
      if (err)
        return cb(err)

      if (res.statusCode !== 200)
        return cb(Error.Generic(body))

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
      uri: `/envelopes/${results.get.docusign_id}?resend_envelope=true`,
      method: 'PUT',
      headers,
      body: {},
      json: true
    }

    docusignRequest(results.get.created_by, params, (err, res, body) => {
      if (err)
        return cb(err)

      if (res.statusCode !== 200)
        return cb(Error.Generic(body))

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
  EnvelopeRecipient.getAll([id], (err, recipients) => {
    if(err)
      return cb(err)

    if (recipients.length < 1)
      return cb(Error.ResourceNotFound('Envelope recipient' + id + ' not found'))

    const recipient = recipients[0]

    return cb(null, recipient)
  })
}

EnvelopeRecipient.getAll = (recipient_ids, cb) => {
  db.query('envelope/recipient/get', [recipient_ids], (err, res) => {
    if (err)
      return cb(err)

    const recipients = res.rows

    return cb(null, recipients)
  })
}


EnvelopeRecipient.associations = {
  user: {
    enabled: true,
    model: 'User'
  }
}

EnvelopeDocument = {}

EnvelopeDocument.get = (id, cb) => {
  EnvelopeDocument.getAll([id], (err, documents) => {
    if(err)
      return cb(err)

    if (documents.length < 1)
      return cb(Error.ResourceNotFound('Envelope document' + id + ' not found'))

    const document = documents[0]

    return cb(null, document)
  })
}

EnvelopeDocument.getAll = (document_ids, cb) => {
  db.query('envelope/document/get', [document_ids], (err, res) => {
    if (err)
      return cb(err)

    const documents = res.rows

    return cb(null, documents)
  })
}

module.exports = function () {}
