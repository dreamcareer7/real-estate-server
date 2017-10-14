const promisify = require('../../utils/promisify')

const sensitive = [
  'closing_date',
  'sold_price',
  'closing_price'
]

Deal.BrokerWolf = {}

Deal.BrokerWolf.considerSync = async old => {
  const updated = await promisify(Deal.get)(old.id)

  let shouldUpdate = false

  for(const attr of sensitive) {
    const oldValue = Deal.getContext(old, attr)
    const newValue = Deal.getContext(updated, attr)

    if (oldValue !== newValue)
      shouldUpdate = true
  }

  if (!shouldUpdate)
    return

  Deal.BrokerWolf.sync(updated)
}

Deal.BrokerWolf.sync = async deal => {
  console.log('Should Sync BrokerWolf')
}