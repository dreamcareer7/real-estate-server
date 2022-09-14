const expect = require('../utils/validator').expect
module.exports = ({ user, pass }) => {
  expect(user).to.be.a('string')
  expect(pass).to.be.a('string')

  return (req, res, next) => {
    const authHeader = req.headers.authorization
    const unAuthorized = () => {
      res.setHeader('WWW-Authenticate', 'Basic')
      return res.status(401).end()
    }
    if (!authHeader) {
      return unAuthorized()
    }
    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':')
    if (user === auth[0] && pass === auth[1]) {
      return next() // authorized
    }
    return unAuthorized()
  }
}
