const getKmsClient = () => {
  const encrypt = (params, cb) => {
    return cb(null, { CiphertextBlob: params.Plaintext })
  }

  const decrypt = (params, cb) => {
    return cb(null, { Plaintext: params.CiphertextBlob })
  }

  return {
    encrypt,
    decrypt
  }
}

const encrypt = (Plaintext) => {
  const kms = getKmsClient()

  return new Promise((resolve, reject) => {
    const params = { Plaintext }

    kms.encrypt(params, (err, data) => {
      if (err) {
        reject(err)

      } else {

        if (data.CiphertextBlob) {
          const buffer = new Buffer(data.CiphertextBlob)
          resolve(buffer.toString('base64'))
        }

        reject('CiphertextBlob not found')
      }
    })
  })
}

const decrypt = (CiphertextBlob) => {
  const kms = getKmsClient()

  return new Promise((resolve, reject) => {
    const params = { CiphertextBlob }

    kms.decrypt(params, (err, data) => {
      if (err) {
        reject(err)

      } else {

        if (data.Plaintext) {
          const buffer = new Buffer(data.Plaintext, 'base64')
          resolve(buffer.toString('utf-8'))
        }
        
        reject('Plaintext not found.')
      }
    })
  })
}

module.exports = {
  encrypt,
  decrypt
}