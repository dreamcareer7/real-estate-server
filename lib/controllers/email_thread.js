const am          = require('../utils/async_middleware.js')
const Brand       = require('../models/Brand')
const EmailThread = require('../models/Email/thread')

const GoogleCredential    = require('../models/Google/credential')
const GoogleMessage       = require('../models/Google/message')
const MicrosoftCredential = require('../models/Microsoft/credential')
const MicrosoftMessage    = require('../models/Microsoft/message')

const { deleteGmailThreads, deleteGmailMessages, updateGmailThreads, updateGmailMessages } = require('../models/Email/senders/gmail')
const { deleteOutlookThreads, deleteOutlookMessages, UpdateOutlookThreads, updateOutlookMessages } = require('../models/Email/senders/outlook')

const googleCommon    = require('../models/Google/common')
const microsoftCommon = require('../models/Microsoft/common')

const sendSlackMessage = googleCommon.sendSlackMessage



function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id) {
    throw Error.BadRequest('Brand is not specified.')
  }
  
  return brand.id
}

function brandAccess(req, res, next) {
  const brand = getCurrentBrand()
  const user = req.user.id

  return Brand.limitAccess({ user, brand }).nodeify(err => {
    if (err) {
      return res.error(err)
    }

    next()
  })
}


const listThreads = async(req, res) => {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const is_read = (req.query.is_read === 'true' ? true : (req.query.is_read === 'false' ? false : undefined))
  const has_attachments = (req.query.has_attachments === 'true' ? true : (req.query.has_attachments === 'false' ? false : undefined))
  const start = req.query.start ? parseInt(req.query.start) : 0
  const limit = req.query.limit ? parseInt(req.query.limit) : 50
  const query = req.query.q ? req.query.q : req.body.q

  const filtered_ids = Array.isArray(req.query.ids)
    ? req.query.ids
    : (Array.isArray(req.body.ids)
      ? req.query.ids
      : null)

  const q = { start, limit, ids: filtered_ids, q: query, next: req.body.next || {} }
  if (is_read !== undefined) q.is_read = is_read
  if (has_attachments !== undefined) q.has_attachments = has_attachments

  const { ids, total, next } = await EmailThread.filter(user, brand, q)
  const threads = await EmailThread.getAll(ids)

  if (threads.length === 0) {
    return res.collection([], { next: {} })
  }

  threads[0].total = total
  return res.collection(threads, { next })
}

const getThread = async (req, res) => {
  const brand = getCurrentBrand()
  const user  = req.user.id

  const authorized = await EmailThread.hasAccess(req.params.id, user, brand)
  if (!authorized)
    throw Error.BadRequest('Access denied to this thread.')

  const thread = await EmailThread.get(req.params.id)

  return res.model(thread)
}


const validateAccess = async (gids, mids, user, brand) => {
  const gCredentials = await GoogleCredential.getAll(gids)
  const mCredentials = await MicrosoftCredential.getAll(mids)

  gCredentials.forEach(credential => {
    googleCommon.checkModifyAccess(credential, user, brand)
  })

  mCredentials.forEach(credential => {
    microsoftCommon.checkModifyAccess(credential, user, brand)
  })

  return {
    gCredentials,
    mCredentials
  }
}

const checkThreads = async (req, res) => {
  const brand = getCurrentBrand()
  const user  = req.user.id

  if (!req.body.thread_keys) {
    throw Error.Validation('Thread_keys must be specified!')
  }

  if (!Array.isArray(req.body.thread_keys)) {
    throw Error.BadRequest('Thread_keys is not Array!')
  }

  const threadKeys = req.body.thread_keys

  if ( threadKeys.length === 0 ) {
    return res.status(202).end()
  }

  const gCredentialIds = await GoogleMessage.getDistinctCredentialByThread(threadKeys)
  const mCredentialIds = await MicrosoftMessage.getDistinctCredentialByThread(threadKeys)

  const { gCredentials, mCredentials } = await validateAccess(gCredentialIds, mCredentialIds, user, brand)

  return {
    gCredentials,
    mCredentials,
    threadKeys
  }
}

const checkMessages = async (req, res) => {
  const brand = getCurrentBrand()
  const user  = req.user.id

  if (!req.body.message_ids) {
    throw Error.Validation('Message_ids must be specified!')
  }

  if (!Array.isArray(req.body.message_ids)) {
    throw Error.BadRequest('Message_ids is not Array!')
  }

  const messageIds = req.body.message_ids

  if ( messageIds.length === 0 ) {
    return res.status(202).end()
  }

  const gCredentialIds = await GoogleMessage.getDistinctCredentialByMessage(messageIds)
  const mCredentialIds = await MicrosoftMessage.getDistinctCredentialByMessage(messageIds)

  const { gCredentials, mCredentials } = await validateAccess(gCredentialIds, mCredentialIds, user, brand)

  return {
    gCredentials,
    mCredentials,
    messageIds
  }
}

const deleteThreads = async (req, res) => {
  const { gCredentials, mCredentials, threadKeys } = await checkThreads(req, res)

  try {
    await deleteGmailThreads(gCredentials, threadKeys)
    await deleteOutlookThreads(mCredentials, threadKeys)
  } catch (ex) {
    sendSlackMessage(`Threads-Delete-Failed - Ex: ${ex.message}`, ex)
  }

  return res.status(202).end()
}

const deleteMessages = async (req, res) => {
  const { gCredentials, mCredentials, messageIds } = await checkMessages(req, res)

  try {
    await deleteGmailMessages(gCredentials, messageIds)
    await deleteOutlookMessages(mCredentials, messageIds)
  } catch (ex) {
    sendSlackMessage(`Messages-Delete-Failed - Ex: ${ex.message}`, ex)
  }

  return res.status(202).end()
}

const updateThreadsStatus = async (req, res) => {
  const { gCredentials, mCredentials, threadKeys } = await checkThreads(req, res)

  const status = Boolean(req.body.is_read)

  try {
    await updateGmailThreads(gCredentials, threadKeys, status)
    await UpdateOutlookThreads(mCredentials, threadKeys, status)
  } catch (ex) {
    sendSlackMessage(`Threads-Update-Status-Failed - Ex: ${ex.message}`, ex)
  }

  return res.status(202).end()
}

const updateMessagesStatus = async (req, res) => {
  const { gCredentials, mCredentials, messageIds } = await checkMessages(req, res)

  const status = Boolean(req.body.is_read)

  try {
    await updateGmailMessages(gCredentials, messageIds, status)
    await updateOutlookMessages(mCredentials, messageIds, status)
  } catch (ex) {
    sendSlackMessage(`Messages-Update-Status-Failed - Ex: ${ex.message}`, ex)
  }

  return res.status(202).end()
}


const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/emails/threads', auth, brandAccess, am(listThreads))
  app.post('/emails/threads/filter', auth, brandAccess, am(listThreads))
  app.get('/emails/threads/:id', auth, brandAccess, am(getThread))

  app.delete('/emails/threads/trash', auth, brandAccess, am(deleteThreads))
  app.delete('/emails/messages/trash', auth, brandAccess, am(deleteMessages))
  app.put('/emails/threads/status', auth, brandAccess, am(updateThreadsStatus))
  app.put('/emails/messages/status', auth, brandAccess, am(updateMessagesStatus))
}

module.exports = router
