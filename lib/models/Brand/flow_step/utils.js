const { strict: assert } = require('assert')

function formatWaitFor(wait_for) {
  const entries = Object.entries(wait_for)
  if (entries.length > 1) {
    assert.fail('can\'t handle two units in a flow step\'s wait_for')
  }
  if (entries.length === 0) {
    wait_for.days = 0
  }
  const [wait_for_unit] = Object.keys(wait_for)

  return {
    wait_for: `${wait_for[wait_for_unit]} ${wait_for_unit}`,
    wait_for_unit,
  }
}

module.exports = { formatWaitFor }