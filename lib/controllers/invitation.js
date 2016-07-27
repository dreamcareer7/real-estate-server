var async = require('async');

function recordInvitation(req, res) {
  var user_id = req.user.id;
  var invitations = req.body.invitations;

  if (!Array.isArray(invitations))
    return res.error(Error.Validation('You must supply an array of invitations'));

  invitations.map(function(r) {
    r.inviting_user = user_id;
  });

  async.map(invitations, Invitation.create, function(err, invitations) {
    if(err)
      return res.error(err);

    return res.collection(invitations);
  });
}


var router = function(app) {
  var b = app.auth.bearer;

  app.post('/invitations', b(recordInvitation));
};

module.exports = router;
