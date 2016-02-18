var config = require('../config.js');

function uploadMedia(req, res) {
  S3.parseSingleFormData(req, function(err, media) {
    if(err)
      return res.error(err);

    S3.upload('avatars', media, function(err, upload) {
      if (err)
        return res.error(err);

      return res.json(upload.get);
    });
  });
}

function uploadMediaFake(req, res) {
  var user = req.params.id;

  console.time("upload");
  S3.parseSingleFormData(req, function(err, media) {
    if(err)
      return res.error(err);

    res.status(200);
    res.json({
      type: 'attachment',
      url: 'http://foobar.org'
    });
    return console.timeEnd("upload");
  });
}

var router = function(app) {
  var b = app.auth.bearer;

  app.post('/attachments/fake', uploadMediaFake);
  app.post('/attachments', b(uploadMedia));
};

module.exports = router;
