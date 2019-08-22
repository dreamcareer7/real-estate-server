const am = require('../utils/async_middleware.js')

const Slack         = require('../models/Slack')
const Brand         = require('../models/Brand')
const ThreadMessage = require('../models/Email/thread')


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

const getThread = async function (req, res) {
  // const brand = getCurrentBrand()
  // const user  = req.user.id

  // Any security check ???

  try {
    const messages = await ThreadMessage.getByThread(req.params.tk)

    return res.json(messages)

  } catch (ex) {

    Slack.send({ channel: '7-server-errors', text: `Get-Thread-Emails-Failed - ThreadKey: ${JSON.stringify(req.params.tk)} - Ex: ${JSON.stringify(ex)}`, emoji: ':skull:' })

    throw Error.BadRequest('Google-Send-Emails Failed!')
  }
}



const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/emails/thread/:tk', auth, brandAccess, am(getThread))

  /*
    curl -XGET http://localhost:3078/emails/thread/89bf4a31-5b7a-4a60-9275-dc6a43cca35816c8ca2e186d3606 \
    -H 'Authorization: Bearer MjhjZTExYzItYmY1OC0xMWU5LThkN2ItMTY2M2JiMWI5MGYw' \
    -H 'X-RECHAT-BRAND: 7b12b516-2a23-11e9-ad24-0a95998482ac'
  */
}

module.exports = router