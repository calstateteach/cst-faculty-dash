/* Route handler for testing contents of LTI launch request.
11.29.2017 tps Created.
*/

var isValidRequest = require('../../libs/oauthHelper').validateLtiRequest;

function launchLti(req, res) {
  // Landing page for an LTI launch request.

  // Get rid of any existing session data for this client.
  req.session.regenerate( (err) => {
    if (err) {
      return res.render('dev/err', { 'err': err } );
    }

    // Flag the method used to authorize the session user.
    req.session.userAuthMethod = 'dev';

    res.render('dev/viewPost', { body: req.body });
  });
}

//************************* Module Exports *************************
module.exports = launchLti;
