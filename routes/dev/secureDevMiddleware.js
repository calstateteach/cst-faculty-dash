/* Router middleware that makes sure user has logged in.
08.23.2017 tps Created.
*/

function checkLogin(req, res, next) {
  if (req.session.userAuthMethod === 'dev') {
    next();
  } else {
    // Use relative redirect because we might be behind a reverse proxy
    res.redirect('../devlogin');
  }
}

module.exports = checkLogin;
