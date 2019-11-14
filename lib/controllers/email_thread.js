const am      = require('../utils/async_middleware.js')
const Context = require('../models/Context')

const Slack         = require('../models/Slack')
const Brand         = require('../models/Brand')
const ThreadMessage = require('../models/Email/threadMessage')



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
  const brand = getCurrentBrand()
  const user  = req.user.id

  const authorized = await ThreadMessage.checkByThread(req.params.tk, user, brand)
  if (!authorized)
    throw Error.BadRequest('Access denied to this thread.')

  try {
    const messages = await ThreadMessage.getByThread(req.params.tk)

    return res.collection(messages)

  } catch (ex) {

    console.log('********* getThread-failed', ex)
    Slack.send({ channel: '7-server-errors', text: `Get-Thread-Emails-Failed - ThreadKey: ${JSON.stringify(req.params.tk)} - Ex: ${ex.message}`, emoji: ':skull:' })

    throw ex
  }
}



const router = function (app) {
  const auth = app.auth.bearer.middleware

  app.get('/emails/threads/:tk', auth, brandAccess, am(getThread))

  /*
    curl -XGET http://localhost:3078/emails/thread/89bf4a31-5b7a-4a60-9275-dc6a43cca35816c8ca2e186d3606 \
    -H 'Authorization: Bearer MjhjZTExYzItYmY1OC0xMWU5LThkN2ItMTY2M2JiMWI5MGYw' \
    -H 'X-RECHAT-BRAND: 7b12b516-2a23-11e9-ad24-0a95998482ac'
  */
}

module.exports = router