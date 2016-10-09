const uuid = require('node-uuid')
const path = require('path')
const async = require('async')
const request = require('request')
const config = require('../config.js')
const url2png = require('url2png')(config.url2png.api_key, config.url2png.private_key)

Poster = {}

Poster.html = function(name, params, cb) {
  Template.render(__dirname + '/../html/poster/' + path.basename(name) + '.html', params, (err, html) => {
    if (err)
      return cb(err)

    cb(null, html)
  })
}

Poster.image = function(name, params, cb) {
  const html = cb => Poster.html(name, params, cb)

  const upload = (cb, results) => {    
    const id = uuid.v1()

    const file = {
      name: id,
      ext: '.html',
      body: results.html,
      info: {
        mime: 'text/html',
        'mime-extension': 'html'
      }
    }

    S3.upload('posters', file, (err, upload) => {
      if(err)
        return cb(err)

      cb(null, upload.url)
    })
  }

  const image = (cb, results) => {
    const options = {
      viewport: '1024x682',
      protocol: 'http'
    }
    
    //Get the URL 
    const url = url2png.buildURL(results.upload, options)
    request(url, err => {
      if(err)
        return cb(Error.Generic(err))
      
      cb(null, url)
    })
  }
  
  async.auto({
    html: html,
    upload: ['html', upload],
    image: ['upload', image]
  }, (err, results) => {
    if(err)
      return cb(err)
    
    cb(null, results.image)
  })
}

