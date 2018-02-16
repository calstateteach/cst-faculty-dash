/* Handler function to render faculty list page.
08.24.2017 tps Created.
08.26.2017 tps Handle errors from canvasEntities.
01.09.2018 tps Try using a shared disk cache for Canvas data.
02.14.2018 tps Add filterEnrollmentsByType() helper function from obsolete canvasEntities.js.
*/

// const canvasEntities = require('../../libs/canvasEntities');
const canvasCache = require('../../libs/canvasCache');


// ******************** Constants ********************//

const FACULTY_TYPES = [ 'TaEnrollment', 'TeacherEnrollment'];


function renderFacultyList(req, res) {
  // Helper callback function that renders the page
  // from faculty enrollment list data.

  // canvasEntities.getFacultyList(req, (err, json) => {
  canvasCache.getFacultyList(req, true, (err, json) => {
    if (err) return renderError(res, err);

    // Filter into Teacher & TA lists
    var renderDictionary = {
      // teachers: canvasEntities.filterEnrollmentsByType(json, 'TeacherEnrollment'),
      // tas: canvasEntities.filterEnrollmentsByType(json, 'TaEnrollment')
      teachers: filterEnrollmentsByType(json, 'TeacherEnrollment'),
      tas: filterEnrollmentsByType(json, 'TaEnrollment')
    };
    res.render('dev/facultyList', renderDictionary );
  }); // end getFacultyList call.

  // // List of courses to display comes from external configuration.
  // req.app.locals.config.readJson( (err, jsonConfig) => {
  //   if (err) return renderError(res, err);
  //   renderFacultyListForCourses(req, res, jsonConfig.displayList);
  // });
} // end function renderFacultyList


// function renderFacultyListForCourses(req, res, displayList) {
//   canvasEntities.getFacultyList(req.session, displayList, (err, json) => {
//     if (err) return renderError(res, err);
//
//     // Filter into Teacher & TA lists
//     var renderDictionary = {
//       teachers: canvasEntities.filterEnrollmentsByType(json, 'TeacherEnrollment'),
//       tas: canvasEntities.filterEnrollmentsByType(json, 'TaEnrollment')
//     };
//     res.render('dev/facultyList', renderDictionary );
//   }); // end getFacultyList call.
// } // end function renderFacultyListForCourses


function renderError(res, err) {
  // Helper function to render error page.
  return res.render('dev/err', { 'err': err } );
}


// ******************** Helper Functions ********************//

filterEnrollmentsByType = (enrollmentList, enrollmentType) => {
  /* Extract unique users from enrollment list, filtered by type.
  */
  var filteredList = [];
  for (let o of enrollmentList) {
    if (o.type === enrollmentType) {

      // Don't add duplicate users to list
      if (!filteredList.find((e) => { return e.id === o.user_id } )) {
        filteredList.push(o.user);
      }
    }
  }
  return filteredList;
};



// ******************** Export module as a function ********************//
module.exports = renderFacultyList;
