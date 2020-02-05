const config = require('../../config.js')
const AWS    = require('aws-sdk')

const region = process.env.AWS_REGION || config.aws.AWS_REGION
const KeyId  = process.env.AWS_KMS_KEY_ID || config.aws.AWS_KMS_KEY_ID

AWS.config.update({ region })

// Doc: https://docs.aws.amazon.com/kms/latest/developerguide/programming-encryption.html
const kms = new AWS.KMS()



const encrypt = (Plaintext) => {
  return new Promise((resolve, reject) => {
    const params = {
      KeyId,
      Plaintext
    }

    kms.encrypt(params, (err, data) => {
      if (err) {
        reject(err)

      } else {

        if (data.CiphertextBlob)
          resolve(data.CiphertextBlob.toString('base64'))

        reject('CiphertextBlob not found')
      }
    })
  })
}

const decrypt = (CiphertextBlob) => {
  return new Promise((resolve, reject) => {
    const params = {
      CiphertextBlob
    }

    kms.decrypt(params, (err, data) => {
      if (err) {
        reject(err)

      } else {

        if (data.Plaintext)
          resolve(data.Plaintext.toString('utf-8'))
        
        reject('Plaintext not found.')
      }
    })
  })
}

module.exports = {
  encrypt,
  decrypt
}