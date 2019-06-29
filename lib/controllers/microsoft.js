const am = require('../utils/async_middleware.js')

const Brand = require('../models/Brand')


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

function getCurrentBrand() {
  const brand = Brand.getCurrent()

  if (!brand || !brand.id)
    throw Error.BadRequest('Brand is not specified.')
  
  return brand.id
}

const grantAccess = async function (req, res) {  

  console.log(req.headers)
  console.log(req.query)
  console.log(req.body)

  // res.writeHead(302, { 'Location': redirect })
  res.end()
}



const router = function (app) {
  const auth = app.auth.bearer.middleware

  // app.post('/users/self/microsoft', auth, brandAccess, am(requestMicrosoftAccess))
  // app.get('/users/self/microsoft', auth, brandAccess, am(getMicrosoftProfiles))
  // app.get('/users/self/microsoft/:id', auth, brandAccess, am(getMicrosoftProfile))

  // app.delete('/users/self/microsoft/:id', auth, brandAccess, am(revokeAccess))
  // app.delete('/users/self/microsoft/:id/sync', auth, brandAccess, am(disableEnableSync))
  // app.put('/users/self/microsoft/:id/sync', auth, brandAccess, am(disableEnableSync))
  
  app.get('/webhook/microsoft/grant', am(grantAccess))

  // app.get('/users/self/microsoft/sync_history/:id', auth, brandAccess, am(getGCredentialLastSyncHistory))


  // test api
  // app.post('/users/test/microsoft', am(requestMicrosoftAccessTest))
}

module.exports = router