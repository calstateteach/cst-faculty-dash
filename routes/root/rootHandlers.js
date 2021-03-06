/* Handler functions for root route.
08.24.2017 tps Created.
08.25.2017 tps Add badRequest handler.
*/


function getDevLogin(req, res) {
  // Render developer login page.
  res.render('root/devLogin');
}

function validateLogin(req, res) {

  var user = req.body.username;
  var secret = req.body.usersecret;

  if ( (process.env.CST_DEV_USER === user)
    && (process.env.CST_DEV_SECRET == secret)) {
      // Flag the method used to authorize the session user.
      req.session.userAuthMethod = 'dev';

      res.redirect('dev/home');
    } else {
      var params = {
         err: "Invalid login",
         defaultName: user
      };
      res.render('root/devLogin', params);
  }
}


function badRequest(req, res) {
  // Let user know he's not allowed here.
  var params = {
    requestHeaders: req.headers
  };
  res.render('root/badRequest', params);
}


//******************** Exports ********************//
exports.getDevLogin = getDevLogin;
exports.validateLogin = validateLogin;
exports.badRequest = badRequest;
