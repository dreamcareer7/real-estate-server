const mock = () => {}
const { join } = require('../../socket/attach')

const isTest = process.env.NODE_ENV === 'tests'

module.exports = {
  join: isTest ? mock : join
}
