/**
 * @namespace Crypto
 */

const config = require('../config.js')
const crypto = require('crypto')

const algorithm = 'aes-256-ctr'
const key = crypto.createHash('sha256').update(config.crypto.key, 'ascii').digest()
const iv = config.crypto.iv

Crypto = {}

/**
 * Encrypts a plain data based on key and iv parameters using **AES-256-CTR**
 * @name encrypt
 * @function
 * @memberof Crypto
 * @instance
 * @public
 * @param {buffer} data - data buffer to be encrypted
 * @param {callback} cb - callback function
 * @returns {buffer} encrypted data
 */
Crypto.encrypt = function (data) {
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let crypted = cipher.update(data, 'utf8', 'base64')
  crypted += cipher.final('base64')
  return crypted
}

/**
 * Decrypts an encrypted data based on key and iv parameters using **AES-256-CTR**
 * @name decrypt
 * @function
 * @memberof Crypto
 * @instance
 * @public
 * @param {buffer} data - encrypted data buffer to be decrypted
 * @param {callback} cb - callback function
 * @returns {buffer} decrypted data
 */
Crypto.decrypt = function (data) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  let dec = decipher.update(data, 'base64', 'utf8')
  dec += decipher.final('utf8')
  return dec
}

module.exports = function () {}
