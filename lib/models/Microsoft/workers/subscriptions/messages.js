const config  = require('../../../../config')
const Context = require('../../../Context')

const MicrosoftCredential   = require('../../credential')
const MicrosoftContact      = require('../../contact')
const MicrosoftMessage      = require('../../message')
const MicrosoftSubscription = require('../../subscription')

const Contact = require('../../../Contact/index')
const Email   = require('../../../Email/index.js')


const createNewSubscriptions = async (microsoft, data) => {


  return {
    status: null,
    ex: null
  }
}

const updateSubscriptions = async (microsoft, data) => {


  return {
    status: null,
    ex: null
  }
}


const handleSubscriptions = async (microsoft, data) => {
  const allSubscriptions = await MicrosoftSubscription.getByCredential(data.microsoftCredential)
  const subscriptions    = allSubscriptions.filter(rec => { if ( rec.resource === 'me/messages' ) return true })

  if ( subscriptions.length === 0 )
    return await createNewSubscriptions(microsoft, data)

  return await updateSubscriptions(microsoft, data)
}


module.exports = {
  handleSubscriptions
}