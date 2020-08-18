const chargebee = require('../chargebee')

const getCheckoutUrl = async (subscription, options) => {
  const { embed } = options

  const data = {
    subscription: {
      id: subscription.chargebee_id
    },
    embed
  }

  const { hosted_page } = await chargebee.hosted_page.checkout_existing(data).request()
  return hosted_page.url
}

module.exports = {
  getCheckoutUrl
}
