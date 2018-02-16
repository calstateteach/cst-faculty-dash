/* Router for faculty dashboard path.
08.25.2017 tps Created
08.26.2017 tps Minimally handle canvasEntities errors.
08.27.2017 tps Signature of getFacultyList`changed.
08.31.2017 tps Removed renderModuleDetailPageFromConfig(), which duplicated
                addUserEnrollmentsFromCourseListConfig().
08.31.2017 tps Populate facultyUser object instead of userEnrollments array.
09.01.2017 tps Populate facultyuser object with assignment status from CritiqueIt.
09.08.2017 tps Don't report CritiqueIt API error due to invalid course ID.
11.28.2017 tps Gather CE hours totals for each student.
12.27.2017 tps Add fillDefaultAssignmentNames() to populate Web page with default names
               for new iSupervision assignments.
12.28.2017 tps Add route for addISupeAssignment which adds a new iSupervision assignment.
12.29.2017 tps Use HTML description read from file when adding iSupervision assignment.
12.31.2017 tps For iSupervision course assignments, display Canvas status instead of CritiqueIt status.
01.01.2018 tps Pass req instead of sessionCache parameters so that we an access app locals.
01.01.2018 tps Add experimental function assignTerm().
01.04.2018 tps Include CST term data in display data.
01.09.2018 tps Experiment with a shared disk cache for Canvas data.
01.16.2018 tps To speed up queries, store user's section IDs to session cache.
01.16.2018 tps To speed up queries, store user's iSupervision cousre IDs to session cache.
01.16.2018 tps On request to refresh data, clear user-specific cache items only.
01.16.2018 tps Send user to wait page when refreshing data from student module detail page.
01.18.2018 tps Replace use of canvasEntities module with canvasCache module.
01.24.2018 tps Display 'Needy' CE Hours total in dashboard for each student.
01.24.2018 tps Always retrieve current CE Hours, not cached.
02.07.2018 tps Fix crash that happens if a faculty's section has no students.
*/

// const async = require('async');
const fs = require('fs');
const express = require('express');
const router = express.Router();
// const canvasEntities = require('../../libs/canvasEntities');
// const canvasAddAssignment = require('../../libs/canvasAddAssignment');
// const iSupeCourseHelper = require('../../libs/iSupeCourseHelper');
// const configHelper = require('./configRouterHelper');
const protectCanvasData = require('./protectCanvasData');
const ceHoursAggregator = require('../../libs_db/ce_hours_aggregator');
const critApi = require('../../libs/critiqueItApiCached');
const termFormatting = require('./termFormatting');
const canvasCache = require('../../libs/canvasCache');

// ******************** Constants ********************//

const FACULTY_TYPES = [ 'TaEnrollment', 'TeacherEnrollment'];
const CACHED_CE_HOURS_TOTALS = 'ceHoursTotals';
const DESCRIPTION_FILE = 'config/assignment_description.html';
  // Path is relative to server.js location?


// ******************** Helper Functions ********************//

function renderFacultyPage(req, res) {
  /* Helper callback function that renders dashboard page
  for a faculty member.
  */
  // Canvas ID of faculty member is passed in the URL
  var userId = parseInt(req.params['userId']);
  protectCanvasData(req, res, userId, null, renderFacultyPageSecured);


} // end function renderFacultyPage


function renderFacultyPageSecured(req, res) {
  /* Helper callback function that renders dashboard page
  for a faculty member.
  */
  // Canvas ID of faculty member is passed in the URL
  var userId = parseInt(req.params['userId']);

  var facultyUser = {}; // Gets filled in by callbacks

  // Define the function at the end of the callback chain
  // that will render the data collected from Canvas API calls
  // into a Web page.
  function renderCallback(err) {
    if (err) return renderError(res, err);
    res.render('dash/facultyDash', { 
       sections: facultyUser.userEnrollments,
       isDevMode: req.session.userAuthMethod === 'dev',    // Indicate whether user is logged in as developer.
       facultyUser: facultyUser,
       cstTerms: facultyUser.cstTerms
    });
  }

  startPopulatingFacultyUser(facultyUser, req, userId, renderCallback);

} // end function renderFacultyPage


function startPopulatingFacultyUser(facultyUser, req, userId, callback) {
  // Start the process of filling in facultyUser.userEnrollments object with all
  // data needed to render the faculty dashboard.

  // Initialize some fields on the faculty user object.
  facultyUser.userEnrollments = [];
  facultyUser.iSupeCourse = null;   // We might not find an iSupevisor course for the faculty member.
  facultyUser.iSupeEnrollments = [];
  // addUserEnrollmentsFromCourseListConfig(facultyUser, req, userId, callback);
  addUserEnrollmentsFromCourseList(facultyUser, req, userId, callback);
}

// 01.10.2018 tps No longer needed.
// function addUserEnrollmentsFromCourseListConfig(facultyUser, req, userId, callback) { 
//   // Gather list of enrollments in courses in configured display list
//   // for the specified user.
//   req.app.locals.config.readJson( (err, configJson) => {
//     addUserEnrollmentsFromCourseList(
//       facultyUser,
//       req,
//       userId,
//       configJson.displayList,
//       configJson.iSupe,
//       callback)
//   });
// } // end function addUserEnrollmentsFromCourseListConfig


// function addUserEnrollmentsFromCourseList(facultyUser, req, userId, displayList, iSupeId, renderCallback) {
function addUserEnrollmentsFromCourseList(facultyUser, req, userId, renderCallback) {
  /* Helper callback function that renders dashboard page
  for a specified faculty member.
  Gather enrollments for the specified user from list of courses specified by ID.
  */

  // Filter faculty enrollments for the specified user.
  // canvasEntities.getFacultyList(req, (err, json) => {
  canvasCache.getFacultyList(req, true, (err, json) => {

    // Get enrollment objects for the given user.
    enrollmentList = json.filter( e => e.user_id === userId);

    // Add enrollment objects to userEnrollments parameter array in place.
    enrollmentList.forEach( e => {
        facultyUser.userEnrollments.push(e);
    });

    // If the enrollmentList is still empty, we probably got an invalid
    // userId, so we can stop the proceedings right now.
    if (enrollmentList.length <= 0) {
      return renderCallback(`No enrollment data found for user ID ${userId}. User might not be in any of the courses configured for the dashboard.`);
    }

    // Save list of user's sections to their session cache, so we have their sections
    // without having to query the enrollment list again.
    var sectionList = [];
    for (section of facultyUser.userEnrollments) {
      sectionList.push({
        course_id:         section.course_id,
        course_section_id: section.course_section_id
      });
    }
    req.session.sectionList = sectionList;

    populateISupeCourse(facultyUser, req, userId, renderCallback);
    // // Fill in the course name
    // addCourseObj(facultyUser, req.session, iSupeId, renderCallback);

  });
}


function populateISupeCourse(facultyUser, req, userId, callback) {
  // Locate the faculty memeber's dedicated iSupervision course,
  // which we identify by its course title, which should look like:
  // "<faculty email login prefix>-iSupervision"
  var userObj = facultyUser.userEnrollments[0].user;
  var emailLoginPrefix = userObj.login_id.split('@')[0];
  var iSupeCourseName = emailLoginPrefix + '-iSupervision';

  // canvasEntities.getCourses(req.session, (err, json) => {
  canvasCache.getCourses(req, true, (err, json) => {
    if (err) return callback(err, json);

    var iSupeCourse = json.find(e => e.name === iSupeCourseName);
    if (iSupeCourse) {
      facultyUser.iSupeCourse = iSupeCourse;

      // To save querying for this course again, store its ID
      // in the user's session.
      req.session.iSupe_course_id = iSupeCourse.id;
    }

    // The next step is filling in the iSupervision student enrollments.
    populateISupeEnrollments(facultyUser, req, userId, callback)
  }); // end callback defintion
} // end function


function populateISupeEnrollments(facultyUser, req, userId, callback) {
  // Populate facultyUser object with enrollments in
  // faculty user's dedicated iSupervision course.
  // There may not be an iSupervision course configured for the faculty user.
  var iSupeId = facultyUser.iSupeCourse ? facultyUser.iSupeCourse.id : null;
  if (iSupeId) {
    // canvasEntities.getCourseEnrollments(req.session, iSupeId, (err, iSupeEnrollments) => {
    canvasCache.getCourseEnrollments(req, iSupeId, true, (err, iSupeEnrollments) => {
     if (err) return callback(err);

     facultyUser.iSupeEnrollments = iSupeEnrollments

     // Continue to next step
     // addCourseObj(facultyUser, req.session, iSupeId, callback);
     addCourseObj(facultyUser, req, iSupeId, callback);
   }); // end callback defintion
 } else {
   // Even if there's not iSupervision course for this guy, we need to continue.
   // process.nextTick(addCourseObj, facultyUser, req.session, iSupeId, callback);
   process.nextTick(addCourseObj, facultyUser, req, iSupeId, callback);
 }// end if there is no iSupervision course
} // end Function



// function addCourseObj(facultyUser, sessionCache, iSupeId, callback) {
function addCourseObj(facultyUser, req, iSupeId, callback) {
  // Add populated propeties of the related course object to each section
  // in the section list.
  // Modifies sectionList.
  var sessionCache = req.session;
  // canvasEntities.getCourses(sessionCache, (err, courses) => {
  canvasCache.getCourses(req, true, (err, courses) => {
    for ( let obj of facultyUser.userEnrollments) {
      course = courses.find((e) => { return e.id === obj.course_id });

      // There are properties from the section's course that we want to display.
      // obj.course_name = course.name;
      obj.course = course;
    };
    // Chain to next step in populating sectionList.
    // addSectionData(facultyUser, sessionCache, iSupeId, 0, callback);
    addSectionData(facultyUser, req, iSupeId, 0, callback);
  });
}


// function addSectionData(facultyUser, sessionCache, iSupeId, currentIndex, callback) {
function addSectionData(facultyUser, req, iSupeId, currentIndex, callback) {

  // If we've visited every section in the list, then we
  // can invoke the callback and be done.
  var sessionCache = req.session;
  if (currentIndex >= facultyUser.userEnrollments.length) {
    // Chain to next step in populating facultyUser.userEnrollments.
    // return process.nextTick(addModules, facultyUser, sessionCache, iSupeId, 0, callback)
    return process.nextTick(addModules, facultyUser, req, iSupeId, 0, callback)
  } else {
    // Gather section data for the current section list item.
    let currentSection = facultyUser.userEnrollments[currentIndex];
    // canvasEntities.getSection(
    canvasCache.getSection(
      // sessionCache,
      req,
      currentSection.course_id,
      currentSection.course_section_id,
      true, 
      (err, json) => {
        // Populate current userEnrollments object, which represents a section,
        // with section data retrieved from Canvas API.
        // 02.07.2018 tps A section may have no students.
        currentSection.section_name = json[0].name;
        // currentSection.students = json[0].students;
        currentSection.students = json[0].students || [];

        // Canvas does't return a sorted student list

        function compareStudents(a, b) {
          // Helper function for sorting an enrollee list.
          var nameA = a.sortable_name;
          var nameB = b.sortable_name;
          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }
          return 0;     // names must be equal
        }
        currentSection.students.sort(compareStudents);

        // Get next section in the list
        addSectionData(facultyUser, req, iSupeId, ++currentIndex, callback);
      }); // end getSetionIncludeStudents callback
  } // ene else more sections to retrieve
} // end function addSectionData


// function addModules(facultyUser, sessionCache, iSupeId, currentIndex, callback) {
function addModules(facultyUser, req, iSupeId, currentIndex, callback) {
  /* Loads modules lists for each course in the userEnrollments list.
  Fills module lists with recursion.
  */

  // If we've visited every section in the list, then we
  // can invoke the callback and be done.
  var sessionCache = req.session;
  if (currentIndex >= facultyUser.userEnrollments.length) {
    // Chain to next step in poulating user enrollments list.
    // return process.nextTick(addAssignments, facultyUser, sessionCache, iSupeId, 0, callback);
    return process.nextTick(addAssignments, facultyUser, req, iSupeId, 0, callback);
  } else {
    // Gather section data for the current section list item.
    let currentSection = facultyUser.userEnrollments[currentIndex];
    // canvasEntities.getModules(
    //   sessionCache,
    canvasCache.getModules(
      req,
      currentSection.course_id,
      true, 
      (err, json) => {
        // Populate current userEnrollments object with the courses's modules.

        // Include only "Assignment" type items.
        for (module of json) {
          module.items = module.items.filter( e => e.type === 'Assignment' );
        }

        currentSection.modules = json;

        // Get next section in the list
        // addModules(facultyUser, sessionCache, iSupeId, ++currentIndex, callback);
        addModules(facultyUser, req, iSupeId, ++currentIndex, callback);
      }); // end getSetionIncludeStudents callback
  } // end else more sections to retrieve
} // end function addModules.


// function addAssignments(facultyUser, sessionCache, iSupeId, currentIndex, callback) {
function addAssignments(facultyUser, req, iSupeId, currentIndex, callback) {
  /* Recursively Load assignment lists for each course in the userEnrollments list.
  */

  // If we've visited every section in the list, then we
  // can invoke the callback and be done.
  var sessionCache = req.session;
  if (currentIndex >= facultyUser.userEnrollments.length) {
    // return callback(null);
    // Chain to the next step in populating userEnrollments collection
    // process.nextTick(addSubmissions, facultyUser, sessionCache, iSupeId, 0, callback);
    process.nextTick(addSubmissions, facultyUser, req, iSupeId, 0, callback);
  } else {
    // Gather assignment data for the current section list item.
    let currentSection = facultyUser.userEnrollments[currentIndex];
    // canvasEntities.getAssignments(
    //   sessionCache,
    canvasCache.getAssignments(
      req,
      currentSection.course_id,
      true,
      (err, json) => {
        // Populate current userEnrollments object with the courses's assignments.
        // This is more data than we need, though.
        currentSection.assignments = json;

        // Get next section in the list
        // addAssignments(facultyUser, sessionCache, iSupeId, ++currentIndex, callback);
        addAssignments(facultyUser, req, iSupeId, ++currentIndex, callback);
      }); // end getSetionIncludeStudents callback
  } // end else more sections to retrieve
} // end function addAssignments


// function addSubmissions(facultyUser, sessionCache, iSupeId, currentIndex, callback) {
function addSubmissions(facultyUser, req, iSupeId, currentIndex, callback) {
  // Recursively load assignment submissions for the section into
  // userEnrollments collection.

  // If we've visited every section in the list, then we
  // can invoke the callback and be done.
  var sessionCache = req.session;  
  if (currentIndex >= facultyUser.userEnrollments.length) {
    // Chain to the next step in populating userEnrollments collection
    // process.nextTick(addISupervisionSections, facultyUser, sessionCache, iSupeId, callback);
    process.nextTick(addISupervisionSections, facultyUser, req, iSupeId, callback);
    // addISupervisionAssignments(userEnrollments, sessionCache, iSupeId, 0, callback);
  } else {
    // Gather submission data for the current section list item.
    let currentSection = facultyUser.userEnrollments[currentIndex];
    // canvasEntities.getSectionSubmissions(
    //   sessionCache,
    canvasCache.getSectionSubmissions(
      req,
      currentSection.course_section_id,
      true, 
      (err, json) => {

        // Attach a submissions array for each student in the section
        for (let student of json) {

          // Find the corresponding student object in userEnrollments object.
          let targetStudent = currentSection.students.find(
            e => { return e.id === student.user_id; } );
          if (targetStudent) {

            // Gather submissions from student.
            // Make it easy to extract a submission object by assignment ID.
            let submissionsObj = {};
            for (let submission of student.submissions) {
              submissionsObj[submission.assignment_id] = submission;
            }
            targetStudent.submissions = submissionsObj;

            // Gather student's total scores
            targetStudent.computed_current_score = student.computed_current_score
            targetStudent.computed_final_score = student.computed_final_score;

          } // end if adding submissions for a student.
        };  // end loop through students

        // Get next section in the list
        // addSubmissions(facultyUser, sessionCache, iSupeId, ++currentIndex, callback);
        addSubmissions(facultyUser, req, iSupeId, ++currentIndex, callback);
      }); // end getSectionSubmissions callback
  } // end else more sections to retrieve
}


// function addISupervisionSections(facultyUser, sessionCache, iSupeId, callback) {
function addISupervisionSections(facultyUser, req, iSupeId, callback) {
  // Populate all the student objects with collection of their corresponding
  // iSupervision course section.
  // No Canvas API calls are required, so his can happen synchronously.
  var sessionCache = req.session;  
  for (section of facultyUser.userEnrollments)  {
    for (student of section.students) {
      student.iSupervisionSections = [];

      var sectionsForStudent = facultyUser.iSupeEnrollments.filter( e => {
        return (e.type === 'StudentEnrollment')
        && (e.user_id === student.id);
      });

      if (sectionsForStudent) {
        student.iSupervisionSections = student.iSupervisionSections.concat(sectionsForStudent);
      }
    } // end loop through students
  } // end loop through sections

  // addISupervisionAssignments(facultyUser, sessionCache, iSupeId, 0, callback);
  addISupervisionAssignments(facultyUser, req, iSupeId, 0, callback);
} // end function

// function addISupervisionAssignments(facultyUser, sessionCache, iSupeId, currentIndex, callback) {
function addISupervisionAssignments(facultyUser, req, iSupeId, currentIndex, callback) {
  // Recursively load each student's assignment overrides from the iSupervision
  // course into the userEnrollments collection.

  // If we've visited every section in the list, then we
  // can invoke the callback and be done.
  var sessionCache = req.session;  
  if (currentIndex >= facultyUser.userEnrollments.length) {
    // Chain to the next step in the process
    // process.nextTick(addMaxISupervisionAssignmentCounts, facultyUser, sessionCache, callback);
    process.nextTick(addMaxISupervisionAssignmentCounts, facultyUser, req, callback);
  } else if (iSupeId) {
    // Gather assignment overrides for students' iSupervision sections.
    // canvasEntities.getAssignments(sessionCache, iSupeId, (err, json) => {
    canvasCache.getAssignments(req, iSupeId, true, (err, json) => {

      let currentSection = facultyUser.userEnrollments[currentIndex];
      for (student of currentSection.students) {
        for (section of student.iSupervisionSections) {

          // Collection to populate with assignment overrides for the section.
          section.assignmentOverrides = [];

          let targetSectionId = section.course_section_id;
          var assignmentsWithOverrides = json.filter( assigment => assigment.has_overrides);
          for (let assignment of assignmentsWithOverrides) {
            let overridesForSection = assignment.overrides.filter( override => override.course_section_id === targetSectionId);
            if (overridesForSection.length > 0) {
              section.assignmentOverrides.push(assignment);
            } // end if section has assignment overrides
          } // end loop through assignment overrides collection
        } // end section loop
      } // end student loop

      // Get next section in the list
      // addISupervisionAssignments(facultyUser, sessionCache, iSupeId, ++currentIndex, callback);
      addISupervisionAssignments(facultyUser, req, iSupeId, ++currentIndex, callback);
    }); // end getAssignments callback
  } else {
    // There are no iSupervision assignments to retrieve, so just go to next iteration.
    // process.nextTick(addISupervisionAssignments, facultyUser, sessionCache, iSupeId, ++currentIndex, callback);
    process.nextTick(addISupervisionAssignments, facultyUser, req, iSupeId, ++currentIndex, callback);
  } // end else

} // end function


// function addMaxISupervisionAssignmentCounts(facultyUser, sessionCache, callback) {
function addMaxISupervisionAssignmentCounts(facultyUser, req, callback) {
  // Count the maximum number of iSupervision assignments
  // for a section & store in userEnrollments section collection.
  // This count is makes it easy for the UI to draw the portion
  // of the table listing the iSupervision assignments.
  var sessionCache = req.session;  
  for (var section of facultyUser.userEnrollments) {
    var maxAssignmentCount = 0;
    for (var student of section.students) {
      for (var iSupeSection of student.iSupervisionSections) {
        var assignmentCount = iSupeSection.assignmentOverrides.length;
        if (assignmentCount > maxAssignmentCount) {
          maxAssignmentCount = assignmentCount;
        }
      } // end loop through sections
    } // end loop through students
    section.maxISupervisionAssignmentsPerStudent = maxAssignmentCount;
  } // end loop through sections

  // We're not done yet. On to the next step.
  
  // 12.31.2017 tps Use Canvas submission status instead of CritiqueIt status.
  // addCritiqueItAssignmentStatus(facultyUser, sessionCache, callback);
  // addISupeCourseSubmissions(facultyUser, sessionCache, callback);
  addISupeCourseSubmissions(facultyUser, req, callback);
} // end function addMaxISupervisionAssignmentCounts


// function addISupeCourseSubmissions(facultyUser, sessionCache, callback) {
function addISupeCourseSubmissions(facultyUser, req, callback) {
  /* Add faculty member's iSupervision course submissions so we can
  display Canvas status instead of CritiqueIt status.
  12.31.2017 tps Created.
  */

  // Initialize the collection we are trying to populate.
  facultyUser.iSupeSubmissions = [];

  // // Experiment with student list
  // var studentIds = [];
  // for (var section of facultyUser.userEnrollments)  {
  //   for (var student of section.students) {
  //     if (student.iSupervisionSections.length > 0) {
  //       studentIds.push(student.id);
  //     }
  //   }
  // }

  // // Experiment with assignment list
  // var assignmentIds = [];
  // for (var section of facultyUser.userEnrollments)  {
  //   for (var student of section.students) {
  //     for (var iSupeSection of student.iSupervisionSections) {
  //       for (var assignmentOverride of iSupeSection.assignmentOverrides) {
  //         console.log('adding assignment for student', student.name);
  //         console.log('adding assignment for assignment', assignmentOverride.name);
  //         assignmentIds.push(assignmentOverride.id);
  //       }
  //     }
  //   }
  // }
  // console.log("assignment ids", assignmentIds);

  var sessionCache = req.session;  
  if (facultyUser.iSupeCourse) {
    // canvasEntities.getCourseSubmissionsByAssignmentIds(sessionCache, facultyUser.iSupeCourse.id, assignmentIds, (err, json) => {
    // canvasEntities.getCourseSubmissionsByStudentIds(sessionCache, facultyUser.iSupeCourse.id, studentIds, (err, json) => {
    // canvasEntities.getCourseSubmissions(sessionCache, facultyUser.iSupeCourse.id, (err, json) => {
    canvasCache.getCourseSubmissions(req, facultyUser.iSupeCourse.id, true, (err, json) => {
      if (err) return callback(err);
      facultyUser.iSupeSubmissions = json;
      // console.log('submissions retrieved', json.length);
      // return fillISupeAssignmentStatus(facultyUser, sessionCache, callback);
      return fillISupeAssignmentStatus(facultyUser, req, callback);
    });
  } else {
    // return process.nextTick(fillISupeAssignmentStatus, facultyUser, sessionCache, callback);
    return process.nextTick(fillISupeAssignmentStatus, facultyUser, req, callback);
  }
}


// function fillISupeAssignmentStatus(facultyUser, sessionCache, callback) {
function fillISupeAssignmentStatus(facultyUser, req, callback) {
  // Fill in iSupervision assignment status from Canvas submission data.
  var iSupeAssignments = facultyUser.iSupeSubmissions;

  // Loop through all the iSupervision assignments
  for (var section of facultyUser.userEnrollments)  {
    for (var student of section.students) {
      var iSupeSections = student.iSupervisionSections[0];
      if (iSupeSections) {
        for (var assignment of iSupeSections.assignmentOverrides) {

          // Default status, in case we can't find one
          assignment.canvasStatus = 'n/a';

          // Find corresponding assignment in Canvas submission data
          var iSupeSubmission = iSupeAssignments.find(
            e => e.assignment_id === assignment.id);
          if (iSupeSubmission) {
            assignment.canvasStatus = iSupeSubmission.workflow_state;
            // console.log("assignment id", assignment.id, assignment.canvasStatus);
          }
        }
      }
    }
  }
  // Next thing to do is gather the total CE Hours for each student.
  // return addCeHours(facultyUser, sessionCache, callback);
  return addCeHours(facultyUser, req, callback);
}


// function addCritiqueItAssignmentStatus(facultyUser, sessionCache, callback) {
function addCritiqueItAssignmentStatus(facultyUser, req, callback) {
  // For faculty users that have an iSupervision course, query
  // the CritiqueIt API for any assignment data for that course &
  // attach it to the faculty user's data object.

  // Initialize the collection we are trying to populate.
  facultyUser.critiqueItAssignments = [];

  var sessionCache = req.session;  
  if (facultyUser.iSupeCourse) {
    critApi.getCourseAssignments(sessionCache, facultyUser.iSupeCourse.id, (err, json) => {
      // Populate the data object & proceed to next step.
      // API returns an error if it doesn't know about the course yet.
      if (!err) {
        facultyUser.critiqueItAssignments = json;
      }
      // return fillCritiqueAssignmentStatus(facultyUser, sessionCache, callback);
      return fillCritiqueAssignmentStatus(facultyUser, req, callback);
    });
  } else {
    return process.nextTick(fillCritiqueAssignmentStatus, facultyUser, req, callback);
    // return process.nextTick(fillCritiqueAssignmentStatus, facultyUser, sessionCache, callback);
  }
} // end function


// function fillCritiqueAssignmentStatus(facultyUser, sessionCache, callback) {
function fillCritiqueAssignmentStatus(facultyUser, req, callback) {
  // Fill in iSupervision assignment status from the CritiqueIt system.
  var critAssignments = facultyUser.critiqueItAssignments;

  // Loop through all the iSupervision assignments
  for (var section of facultyUser.userEnrollments)  {
    for (var student of section.students) {
      var iSupeSections = student.iSupervisionSections[0];
      if (iSupeSections) {
        for (var assignment of iSupeSections.assignmentOverrides) {

          // Default status, in case we can't find one in CritiqueIt.
          assignment.critiqueItStatus = null;

          // Find corresonding CritiqueIt assignment
          var critAssignment = critAssignments.find(
            e => parseInt(e.canvasAssignmentId) === assignment.id);
          if (critAssignment) {
            assignment.critiqueItStatus = critAssignment.status;
          }
        }
      }
    }
  }
  // Next thing to do is gather the total CE Hours for each student.
  // return addCeHours(facultyUser, sessionCache, callback);
  return addCeHours(facultyUser, req, callback);
}

// function addCeHours(facultyUser, sessionCache, callback) {
function addCeHours(facultyUser, req, callback) {
  // Add total CE hours for each student to the facultyUser data structure.

  // In order to reduce the number of DB calls, aggregate a list of
  // all the students we need to query for. The CE hours DB stores
  // hours by student login ID.
  var studentEmailAddresses = [];
  for (var section of facultyUser.userEnrollments)  {
    for (var student of section.students) {
      studentEmailAddresses.push(student.login_id);
    }
  }
  // console.log('email address list', studentEmailAddresses);

  // getAggregateCeHours(sessionCache, facultyUser.userEnrollments[0].user.login_id, studentEmailAddresses, (err, results) => {
  getAggregateCeHours(req, facultyUser.userEnrollments[0].user.login_id, studentEmailAddresses, (err, results) => {
    if (err) return callback(err);

    // Results contain all the student data, but we need to 
    // insert individual student data into the right child objects
    // of the facultyUser object.
    for (var section of facultyUser.userEnrollments)  {
      for (var student of section.students) {

        var enteredHours = results.find( (e) => {
          return (e._id.candidateEmail === student.login_id) 
              && (e._id.approvalState === 'Needy'); });
        student.ce_hours_entered = enteredHours ? enteredHours.totalHours : 0;
        
        var pendingHours = results.find( (e) => {
          return (e._id.candidateEmail === student.login_id) 
              && (e._id.approvalState === 'Pending'); });
        student.ce_hours_pending = pendingHours ? pendingHours.totalHours : 0;
        
        var approvedHours = results.find( (e) => {
          return (e._id.candidateEmail === student.login_id) 
              && (e._id.approvalState === 'Approved'); }); 
        student.ce_hours_approved = approvedHours ? approvedHours.totalHours: 0; 
      }
    }

    // return fillDefaultAssignmentNames(facultyUser, sessionCache, callback);
    return fillDefaultAssignmentNames(facultyUser, req, callback);
  });
}

// function fillDefaultAssignmentNames(facultyUser, sessionCache, callback) {
function fillDefaultAssignmentNames(facultyUser, req, callback) {
  /* Populate data structure with default names for new iSupervision assignments,
  to make it easier for the Web page to suggest names for new assignments.

  Build a unique name for a new iSupervision assignment for each student.
  The name adds a numbered suffix to the specified user's email login ID.
  e.g. If user login is "abcdef@calstateteach.net", then assignment names
  look like "abcdef-1", "abcdef-2" etc.
  */

  for (var section of facultyUser.userEnrollments)  {
    for (var student of section.students) {

      // Make is easy to lookup existing assignment names
      var assignmentNames = [];
      if (student.iSupervisionSections.length > 0) {
         assignmentNames = student.iSupervisionSections[0].assignmentOverrides.map( e => { return e.name; });
      }

      var loginName = student.login_id.split('@')[0];
      var newName = '';
      var n = 1;
      do {
        newName = loginName + '-' + n++;
      } while (assignmentNames.includes(newName));

      student.defaultNewAssignmentName = newName;   // Add default new assignment name to data returned.
    }
  }
  // return assignTerm(facultyUser, req, callback);
  return termFormatting.formatByTerm(facultyUser, req, callback);
}


// ******************** Helper Functions ********************//

function renderSessionCache(req, res, cacheItemName) {
  /* Helper callback function that lists data in the session cache.
  */
  res.render('lti0/sessionCache', {
    sessionCache: req.session,
    cacheItemName: cacheItemName
  });
}

function renderError(res, err) {
  // Helper function to render error page.
  return res.render('dash/facultyDashErr', { 'err': err } );
}

// function getAggregateCeHours(sessionCache, facultyEmail, studentEmailAddresses, callback) {
function getAggregateCeHours(req, facultyEmail, studentEmailAddresses, callback) {
  // Get current CE Hours totals from CE Hours DB.
  ceHoursAggregator.run(studentEmailAddresses, (err, results) => {
    // console.log('Queried for CE Hours aggregate');
    return callback(err, results);
  });

  // // Get CE hours total from DB or cache. Cache by faculty person's email address.
  // // Callback signature: (err, results)

  // // Make sure that the session cache for this data has been initialized.
  // var sessionCache = req.session;  
  // sessionCache[CACHED_CE_HOURS_TOTALS] = sessionCache[CACHED_CE_HOURS_TOTALS] || { };


  // var cachedObj = sessionCache[CACHED_CE_HOURS_TOTALS][facultyEmail];
  // if (cachedObj) {
  //   return process.nextTick(callback, null, cachedObj);
  // } else {
  //   ceHoursAggregator.run(studentEmailAddresses, (err, results) => {
  //     // console.log('Queried for CE Hours aggregate');
  //     sessionCache[CACHED_CE_HOURS_TOTALS][facultyEmail] = results;
  //     return callback(err, results);
  //   });
  // }
}


// ******************** Routing Handler for Detail Page ********************//

function renderModuleDetailPage(req, res) {
  /* Helper callback that renders module details page.
  */
  var userId = parseInt(req.params['userId']);
  var sectionId = parseInt(req.params.sectionId);
  protectCanvasData(req, res, userId, sectionId, renderModuleDetailPageSecured);

} // end function renderModuleDetailPage


function renderModuleDetailPageSecured(req, res) {
  /* Helper callback that renders module details page.
  */
  var userId = parseInt(req.params['userId']);
  var facultyUser = {}; // Gets filled in by callbacks

  // Define the function at the end of the callback chain
  // that will render the data collected from Canvas API calls
  // into a Web page.
  // Pass parameters that specify which section, module & student
  // to display in the Web page.
  function renderCallback(err) {
    if (err) return renderError(res, err);

    var params = {
      sections: facultyUser.userEnrollments,
      sectionId: parseInt(req.params.sectionId),
      moduleId: parseInt(req.params.moduleId),
      studentId: parseInt(req.params.studentId),
      isDevMode: req.session.userAuthMethod === 'dev',    // Indicate whether user is logged in as developer.
      cstTerms: facultyUser.cstTerms
    };
    res.render('dash/studentModuleSubmissions', params );
  }

  startPopulatingFacultyUser(facultyUser, req, userId, renderCallback);
} // end function renderModuleDetailPage


// ******************** Helper Post Functions ********************//

// function postAssignmentAdd(req, res) {
//     // Handler to add assignment override record.

//     // Context in which to add assignment comes from URL
//     var courseId = req.params.courseId;
//     var sectionId = req.params.sectionId;
//     var name = req.params.name;

//     canvasEntities.addAssignment(req.session, courseId, sectionId, name, (err, json) => {

//       // When done, redirect to URL specified by the submit form.
//       res.redirect(req.body.redirectUrl);
//     }); // end canvasEntities callback definition
// } // end function postAssignmentAdd

function postAssignmentAddWithName(req, res) {
  // Handler to add assignment override record
  return step_readAssignmentDescriptionTemplate(req, res);
  // var courseId = req.body.courseId;
  // var sectionId = req.body.sectionId;
  // var name = req.body.assignmentName;

  // canvasEntities.addAssignmentOverride(req.session, courseId, sectionId, name, (err, json) => {
  //   if (err) return renderError(res, err);

  //   // When done, redirect to URL specified by the submit form.
  //   return res.redirect(req.body.redirectUrl);
  // });
}

function step_readAssignmentDescriptionTemplate(req, res) {
  // Load template file into string variable.
  fs.readFile(DESCRIPTION_FILE, 'utf8', function (err, fileData) {
    if (err) return renderError(res, err);
    return step_assignmentAddWithNameAndDesc(req, res, fileData);
  });
}

function step_assignmentAddWithNameAndDesc(req, res, description) {
  // Handler to add assignment override record
  // 01.11.2018 tps Invalidate relevant Canvas cache items when done.
  var courseId = req.body.courseId;
  var sectionId = req.body.sectionId;
  var name = req.body.assignmentName;

  // canvasEntities.addAssignmentOverride(req.session, courseId, sectionId, name, description, (err, json) => {
  canvasCache.addAssignmentOverride(req, courseId, sectionId, name, description, (err, json) => {
    if (err) return renderError(res, err);

    // When done, redirect to URL specified by the submit form.
    return res.redirect(req.body.redirectUrl);
  });
}


// function postISupervisionAssignment(req, res) { // 12.28.2017 tps Never called?
//     // Handler to add assignment override record.

//     // Context in which to add assignment comes from URL
//     var userId = Number.parseInt(req.params.userId);

//     // ID of ISupervision course comes from configuration
//     req.app.locals.config.readJson( (err, configJson) => {
//       var iSupeId = configJson.iSupe;
//       canvasAddAssignment.add(req.session, iSupeId, userId, (err, json) => {

//         // When done, redirect to URL specified by the submit form.
//         res.redirect(req.body.redirectUrl);
//       }); // end add callback
//     }); // end readJson callback


// } // end function postAssignmentAdd

function postDataRefresh(req, res) {
  // Handler to request clearing Canvas data cache.
  // This causes the app to requery the Canvas API for data.

  /* 01.16.2018 tps Selectively clear cache for faculty member section & iSupervision course
  Expect that the user's session cache contains a variable "sessionList" containing an array
  that lists the user's sections, like this:

    [
      {
        "course_id": 86,
        "course_section_id": 863
      },
      {
        "course_id": 52,
        "course_section_id": 371
      }
    ]
  */

  // Build list of cache keys we want to remove
  var keysToRemove = [];

  if (req.session.sectionList) {
    for(section of req.session.sectionList) {
      const course_id = section.course_id;
      const section_id = section.course_section_id;

      // Force requery of section student list
      keysToRemove.push(`courses_${course_id}_sections_${section_id}`);

      // Force requery of section submissions
      keysToRemove.push(`sections_${section_id}_students_submissions`);
    }
  }

  /*
  Expect that the user's session cache contains a variable "isuper_course_id" that
  contains the canvas ID of the user's iSupervision course.
  */
  if (req.session.iSupe_course_id) {
    const iSupe_id = req.session.iSupe_course_id;

    // Force requery of iSupervision student list
    keysToRemove.push(`courses_${iSupe_id}_enrollments`);

    // Force requery of iSupervision assignments
    keysToRemove.push(`courses_${iSupe_id}_assignments`);

    // Force requery of iSupervision submissions
    keysToRemove.push(`courses_${iSupe_id}_students_submissions`);
  }
  // console.log('remove keys', keysToRemove);

  // canvasEntities.clearCanvasCache(req.session);

  // Count iterations of async calls to remove keys
  var iterationCount = 0;

  for (var i = 0; i < keysToRemove.length; ++i) {
    canvasCache.removeKey(req, keysToRemove[i], (err) => {
      if (err) return renderError(res, err);

      // Check if we're done removing all the cache keys
      if (++iterationCount >= keysToRemove.length) {

        // Clear cached critiqueIt data
        critApi.clearCache(req.session);

        // Clear cached CE hours data
        req.session[CACHED_CE_HOURS_TOTALS] = null;

        // // When done, redirect to URL specified by the submit form.
        // res.redirect(req.body.redirectUrl);

        res.redirect(encodeURI(req.app.locals.APP_URL + 'dash/pleaseWait?redirectUrl=' + req.body.redirectUrl));
      }
    });
  } 
}

// ******************** Render Wait Pages ********************//

function renderFacultyWaitPage(req, res) {
  return res.render('dash/facultyDashWait', { userId: req.params['userId']} );
}

function renderPleaseWait(req, res) {
  // General form of redirect from wait page, passing the redirect target as as query string.
  return res.render('dash/pleaseWait', { redirectUrl: req.query['redirectUrl']});
}

// ******************** Routing Functions ********************//

// Secure the dashboard postDataRefresh
router.use(require('./secureDashMiddleware'));
router.get('/facultyPleaseWait/:userId', renderFacultyWaitPage);
router.get('/faculty/:userId', renderFacultyPage);
router.get('/faculty/:userId/section/:sectionId/module/:moduleId/student/:studentId', renderModuleDetailPage);
router.post('/dataRefresh', postDataRefresh);
// router.post('/courses/:courseId/sections/:sectionId/name/:name/assignments', postAssignmentAdd);
router.post('/addISupeAssignment', postAssignmentAddWithName);
router.get('/pleaseWait', renderPleaseWait);

exports.router = router;
