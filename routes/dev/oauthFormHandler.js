/* Handler functions for form that simulates LTI post request.
08.25.2017 tps Created.
08.26.2017 tps Use query string paramter postOnLoad to make page post itself.
02.14.2018 tps Use canvasCache instead of canvasEntites for faculty list.
*/
const oauthDummyData = require('../../libs/oauthDummyData');
// const canvasEntities = require('../../libs/canvasEntities');
const canvasCache = require('../../libs/canvasCache');


function getLtiForm(req, res) {
  includeDisplayCourses(req, res, oauthDummyData.makeSignedParams());
}

function includeDisplayCourses(req, res, fieldList) {
  // canvasEntities.getFacultyList(req, (err, json) => {
  canvasCache.getFacultyList(req, true, (err, json) => {

    if (err) return res.render('dev/err', { 'err': err });

    // Remove duplicate users from list
    var users = [];
    for (enrollment of json) {
      if (!users.find( e => e.id === enrollment.user_id)) {
        users.push(enrollment.user);
      }
    }

    renderForm(req, res, fieldList, users);
  }); // end getFacultyList call.

  // // List of courses to display comes from external configuration.
  // req.app.locals.config.readJson( (err, jsonConfig) => {
  //   includeFacultyList(req, res, fieldList, jsonConfig.displayList);
  // });
}

// function includeFacultyList(req, res, fieldList, courseList) {
//   // Provide list of user IDs that can be used for testing.
//   canvasEntities.getFacultyList(req.session, courseList, (err, json) => {
//     if (err) return res.render('dev/err', { 'err': err });
//
//     // Remove duplicate users from list
//     var users = [];
//     for (enrollment of json) {
//       if (!users.find( e => e.id === enrollment.user_id)) {
//         users.push(enrollment.user);
//       }
//     }
//
//     renderForm(req, res, fieldList, users);
//   }); // end getFacultyList call.
// }

function renderForm(req, res, fieldList, userList) {
  res.render('dev/ltiForm', {
    postFields: fieldList,
    facultyUsers: userList,
    postOnLoad: req.query.postOnLoad
  });
}

function postLtiForm(req, res) {
  // Reopulate LTI form with fresh OAuth signature.

  // Don't include signature field itself when signing
  var oauthBody = Object.assign( {}, req.body);
  delete oauthBody['oauth_signature'];

  includeDisplayCourses(req, res, oauthDummyData.signParams(oauthBody));
}

//******************** Exports ********************//
exports.getLtiForm = getLtiForm;
exports.postLtiForm = postLtiForm;
