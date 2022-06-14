const bodyParser = require('body-parser')

const am = require('../../utils/async_middleware')

const { brandAccess, access } = require('./common')

const { captureLead, leadsEmail, generateLink } = require('./lead')
const { 
  upload,
  importContactsJson, 
  importSpreadsheet, 
  jobStatus,
} = require('./import')
const {
  bulkAddAttributes,
  deleteAttributes,
  updateContactTags,
  addAttributes,
  updateAttribute,
  deleteAttribute,
  attach,
} = require('./attributes')
const {
  fastFilter,
  addContacts,
  undelete,
  updateContacts,
  deleteContacts,
  getContact,
  updateContact,
  updateContactTouchFreq,
  deleteContact,
} = require('./contact')
const {
  mergeAll,
  bulkMerge,
  getDuplicateClusters,
  ignoreAll,
  ignoreCluster,
  ignoreContactFromCluster,
  getContactDuplicateCluster,
  merge,
} = require('./duplicates')
const {
  getAllTags,
  createTag,
  deleteTags,
  updateTagTouchFreq,
  deleteTag,
  patchTag,
} = require('./tag')

const router = function (app) {
  const auth = app.auth.bearer.middleware
  const urlencodedParser = bodyParser.urlencoded({
    extended: true,
    limit: '500kb',
  })
  const xmlParser = bodyParser.text({
    type: 'text/xml',
  })

  app.get('/contacts', auth, brandAccess, am(fastFilter))
  app.post('/contacts', auth, brandAccess, am(addContacts))
  app.post('/contacts/undelete', auth, brandAccess, am(undelete))
  app.get('/contacts/leads', auth, brandAccess, am(generateLink))
  app.post('/contacts/leads/:key', xmlParser, urlencodedParser, am(captureLead))
  app.patch('/contacts', auth, am(updateContacts))
  app.delete('/contacts', auth, am(deleteContacts))
  app.post('/webhook/contacts/leads/email', urlencodedParser, am(leadsEmail))

  app.post('/contacts/attributes', auth, am(bulkAddAttributes))
  app.delete('/contacts/attributes', auth, am(deleteAttributes))
  app.put('/contacts/attributes/tags', auth, am(updateContactTags))

  app.post('/contacts/merge/all', auth, am(mergeAll))
  app.post('/contacts/merge', auth, am(bulkMerge))
  app.get('/contacts/duplicates', auth, brandAccess, am(getDuplicateClusters))
  app.delete('/contacts/duplicates/all', auth, am(ignoreAll))
  app.delete('/contacts/duplicates/:id', auth, brandAccess, am(ignoreCluster))
  app.delete(
    '/contacts/duplicates/:id/contacts/:contact',
    auth,
    brandAccess,
    am(ignoreContactFromCluster)
  )

  app.get('/contacts/tags', auth, brandAccess, am(getAllTags))
  app.post('/contacts/tags', auth, brandAccess, am(createTag))
  app.post('/contacts/tags/delete', auth, brandAccess, am(deleteTags))
  app.patch('/contacts/tags/:tag', auth, brandAccess, am(patchTag))
  app.patch('/contacts/tags/:tag/touch', auth, brandAccess, am(updateTagTouchFreq))
  app.delete('/contacts/tags/:tag', auth, brandAccess, am(deleteTag))

  app.post('/contacts/filter', auth, brandAccess, am(fastFilter))

  app.post('/contacts/upload', auth, brandAccess, upload)
  app.post('/contacts/import.json', auth, brandAccess, am(importContactsJson))
  app.post('/contacts/import.:ext(csv|xlsx?)', auth, brandAccess, am(importSpreadsheet))
  app.get('/contacts/jobs/:job_id', auth, brandAccess, am(jobStatus))

  app.get('/contacts/:id', auth, access('read'), am(getContact))
  app.patch('/contacts/:id', auth, access('write'), am(updateContact))
  app.patch('/contacts/:id/touch', auth, access('write'), am(updateContactTouchFreq))
  app.delete('/contacts/:id', auth, access('write'), am(deleteContact))

  app.post('/contacts/:id/attributes', auth, access('write'), am(addAttributes))
  app.put('/contacts/:id/attributes/:attribute_id', auth, access('write'), am(updateAttribute))
  app.delete('/contacts/:id/attributes/:attribute_id', auth, access('write'), am(deleteAttribute))

  app.get('/contacts/:id/duplicates', auth, access('read'), am(getContactDuplicateCluster))
  app.post('/contacts/:id/merge', auth, am(merge))
  app.post('/contacts/:id/attachments', auth, access('write'), attach)
}

module.exports = router
