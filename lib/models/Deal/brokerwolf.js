const promisify = require('../../utils/promisify')
const context = require('./context')

Deal.BrokerWolf = {}

const sensitive = Object.keys(context).filter(key => Boolean(context[key].brokerwolf))

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

  await Deal.BrokerWolf.sync(updated)
}

Deal.BrokerWolf.sync = async deal => {
  console.log('Should Sync BrokerWolf')
}