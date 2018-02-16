/* Functions that prevent LTI user accessing Canvas data
they are not authorized to view.
08.27.2017 tps Created.
*/
// const canvasEntities = require('../../libs/canvasEntities');

function screenRequest(req, res, userId, sectionId, next) {
  // Callback signature: (req, res)
  // User must be authorized by Web app to view anything.
  switch (req.session.userAuthMethod) {
    case 'dev':
      // Developers are allowed to see everything.
      process.nextTick(next, req, res);
      break;
    case 'lti':
      // LTI users can only see Canvas data for themselves.
      var ltiUserId = parseInt(req.session.custom_canvas_user_id);
      if (userId && (userId != ltiUserId)) {
        return badRequest(req, res);
      }

      // TODO: Secure sectionID
      // // LTI users can only see Canvas data for sections they teach.
      // if (sectionId) {
      //   canvasEntities.getFacultyList(req, (err, json) => {
      //     if (err) return res.render('dash/facultyDashErr', { 'err': err } );
      //
      //     if (!json.find(
      //       e => (e.user_id === ltiUserId) && (e.course_section_id === sectionId))) {
      //         return badRequest(req, res);
      //     }
      //     return badRequest(req, res);
      //   }); // end getFacultyList callback
      //
      //   // If we got this far, it's ok to render the page for the user.
      //   return process.nextTick(next, req, res);
      //
      // } // end if sectionId

      // If we got this far, it's ok to render the page for the user.
      process.nextTick(next, req, res);
      break;
    default:
      // Unauthrorized users shouldn't see any data.
      badRequest(req, res);
     break;
  } // end switch
}


function badRequest(req, res) {
  // Let user know he's not allowed here.
  var params = {
    requestHeaders: req.headers
  };
  res.render('root/badRequest', params);
}

//******************** Module Exports ********************
module.exports = screenRequest;
