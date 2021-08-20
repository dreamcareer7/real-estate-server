/** @typedef {import('../../../types/monkey/controller').IAuthenticatedRequest} IAuthenticatedRequest */
/** @typedef {import('../../../types/monkey/controller').IResponse} IResponse */
/** @typedef {(req: IAuthenticatedRequest, res: IResponse) => Promise<void>} ApiHandler */

/** @type ApiHandler */
async function getTriggers (req, res) {
  res.sendStatus(501)
}

/** @type ApiHandler */
async function upsertBrandTrigger (req, res) {
  res.sendStatus(501)
}

/** @type ApiHandler */
async function toggleBrandTrigger (req, res) {
  res.sendStatus(501)
}

module.exports = function brandTriggerRouter ({ app, b, access, am }) {
  app.get(
    '/brands/:brand/triggers',
    b, access,
    am(getTriggers)
  )
  
  app.put(
    '/brands/:brand/triggers/:event_type',
    b, access,
    am(upsertBrandTrigger)
  )
  
  app.patch(
    '/brands/:brand/triggers/:id/:action(^(enable|disable)$)',
    b, access,
    am(toggleBrandTrigger)
  )
}
