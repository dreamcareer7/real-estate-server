const am = require('../utils/async_middleware')
const Brand = require('../models/Brand')
const { moveCRMDataForUser } = require('../models/Retool/crm')

/**
 * @param {import('../../types/monkey/controller').IAuthenticatedRequest<{}, {}, { source: UUID; destination: UUID; }>} req 
 * @param {import('../../types/monkey/controller').IResponse} res 
 */
async function moveCrmData(req, res) {
  const user = req.user.id
  const { source, destination } = req.body

  await Brand.limitAccess({ brand: source, user })
  await Brand.limitAccess({ brand: destination, user })

  await moveCRMDataForUser(user, source, destination)

  res.status(204)
}

const router = app => {
  const auth = app.auth.bearer.middleware
  app.post('/_/retool/crm/move', auth, am(moveCrmData))
}

module.exports = router
