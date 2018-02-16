/* Module to reformat dashboard data to group students by terms.
Uses data structure created for first version of dashboard, which groups students by course sections.
01.04.2018 tps Created.
02.01.2018 tps Fix for crash when student's term code from CAM does not match Cavnas course enrollment.
02.08.2018 tps Refactor fix for missing/wrong CAM term dode.
*/

function formatByTerm(facultyUser, req, callback) {
  // Start asynch process of reformatting facultyUser data.
  // Callback signature: (err)
  return step_assignTerm(facultyUser, req, callback);
}

function step_assignTerm(facultyUser, req, callback) {
  // Populate data structure with terms that each student are in.
  // Use external spreadsheet to look up term for each student.
  req.app.locals.camData.readRows((err, statusCode, headers, rows) => {
    if (err) return callback(err);

    for (var section of facultyUser.userEnrollments)  {
      for (var student of section.students) {

        // Find student's term in the spreadsheet.
        // Student might not be in the spreadsheet.
        var term = rows.find( (e) => { return (e.email === student.login_id) });
        student.cstTerm = term ? term.course : null;
      }
    }
    return step_readModules(facultyUser, req, callback);
  });
}

function step_readModules(facultyUser, req, callback) {
  // Read module data for the terms
  // Callback signature: (err)
  req.app.locals.moduleMap.readJson( (err, json) => {
    if (err) callback(err);
    facultyUser.cstTerms = JSON.parse(JSON.stringify(json));  // Copy the term map
    
    // Manipulate and re-arrange data so students are grouped by term
    putStudentsInTerms(facultyUser);
    putModulesInTerms(facultyUser);
    addMaxISupervisionAssignmentCounts(facultyUser)
    return callback();
  });
}


/******************** Data Manipulation Functions ********************/

function putStudentsInTerms(facultyUser) {
  // Add a collection of students to each term
  for (var term of facultyUser.cstTerms) {
    term.students = []; // Build collection of students in the term
  }

  for(var enrollments of facultyUser.userEnrollments) {
    for (var student of enrollments.students) {

      // Find the student's term
      let targetTerm = null;
      if (student.cstTerm) {
        targetTerm = facultyUser.cstTerms.find(
          (e) => { return (e.course_id === enrollments.course_id) && (e.code === student.cstTerm) });
      }

      // We might not find a matching term if:
      // - The CAM data does not include a term code for the student.
      // - The CAM code does match one of the terms belonging to the course the student is
      // enrolled in. In this case, assign the student to the default term for the course.
      if (!targetTerm) {
        targetTerm = facultyUser.cstTerms.find(
          (e) => { return e.default && (e.course_id === enrollments.course_id) });
        student.cstTerm = targetTerm.code;  // Fill in the default term for the module detail page.
      }

      targetTerm.students.push(student);  // Add the student to that term's student list

      // // Find the student's term
      // var term;
      // if (student.cstTerm) {
      //   term = facultyUser.cstTerms.find(
      //     (e) => { return (e.course_id === enrollments.course_id) && (e.code === student.cstTerm) });

      //   // We might not find a matching term if the CAM code does match one of the terms
      //   // belonging to the course the student is enrolled in. In this case, assign the student
      //   // to the default term for the course.
      //   if (!term) {
      //     term = facultyUser.cstTerms.find(
      //       (e) => { return e.default && (e.course_id === enrollments.course_id) });
      //     student.cstTerm = term.code;  // Fill in the default term for the module detail page.
      //   }

      // } else {  // ... or put the student in the course's default term
      //   term = facultyUser.cstTerms.find(
      //     (e) => { return e.default && (e.course_id === enrollments.course_id) });
      //   student.cstTerm = term.code;  // Fill in the default term for the module detail page.
      // }
      // term.students.push(student);  // Add the student to that term's student list
    }
  }
  return facultyUser;
}

function putModulesInTerms(facultyUser) {
  // A collection of modules for each term
  for (var term of facultyUser.cstTerms) {
    term.modules = []; // Build collection of modules in the term

    // Find the modules for the course
    var courseSection = facultyUser.userEnrollments.find(
      (e) => { return (e.course_id === term.course_id) } );
    if (courseSection) {
      // Add just the term's modules
      for (var i = 0; i < term.module_indices.length; ++i){
        term.modules.push(courseSection.modules[term.module_indices[i]]);
      }

      // Add other stuff we need for display
      term.course = courseSection.course;
      term.assignments = courseSection.assignments;
      term.user_id = courseSection.user_id; // ID of faculty member assigned to the section
      term.id = courseSection.id; // ID of faculty member's section
    }
  }
  return facultyUser;
}

function addMaxISupervisionAssignmentCounts(facultyUser) {
  // Count the maximum number of iSupervision assignments
  // for a section & store in userEnrollments section collection.
  // This count makes it easy for the UI to draw the portion
  // of the table listing the iSupervision assignments.
  for (var section of facultyUser.cstTerms) {
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
  return facultyUser;
} // end function addMaxISupervisionAssignmentCounts


/******************** Module Exports ********************/
exports.formatByTerm = formatByTerm;