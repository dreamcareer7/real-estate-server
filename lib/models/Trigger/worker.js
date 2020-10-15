const { peanar } = require('../../utils/peanar')
const { executeTrigger } = require('./execute')

const execute = peanar.job({
  handler: executeTrigger,
  queue: 'trigger',
  error_exchange: 'trigger.error',
  retry_exchange: 'trigger.retry',
  retry_delay: 20000,
  max_retries: 10,
  exchange: 'trigger',
  name: 'execute'
})

module.exports = {
  execute,
}
