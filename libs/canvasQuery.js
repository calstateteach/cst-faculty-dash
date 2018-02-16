/* Module that wraps Canvas API queries.
01.10.2018 tps Created.
01.18.2019 tps Fix setting to show new assignments only to override section.

*/

const canvasApi = require('./canvasApiTiny');

//******************** Constants ********************//
const FACULTY_TYPES = [ 'TaEnrollment', 'TeacherEnrollment'];


//******************** Exported Functions ********************//

exports.getCourseFaculty = (courseId, callback) => {
  const endPoint = `courses/${courseId}/enrollments`;
  const params = {
    'type[]': FACULTY_TYPES
  };
  return canvasApi.get(endPoint, params, callback);
}


exports.getCourses = (callback) => {
  // Callback signature: ( err, <json data from Canvas>)
  let params = {
    'include[]': 'term'
  };
  return canvasApi.get('courses', params, callback);
};  // end export definition


exports.getCourseEnrollments = (courseId, callback) => {
  // Callback signature: ( err, <json data from Canvas>)
  let endpoint = `courses/${courseId}/enrollments`;
  let params = { };
  return canvasApi.get(endpoint, params, callback);
};


exports.getModules = (courseId, callback) => {
  // Callback signature: ( err, <json data from Canvas>)
  let endpoint = `courses/${courseId}/modules`;
  let params = {
    'include[]': 'items'
  };
  return canvasApi.get(endpoint, params, callback);
};


exports.getSection = (courseId, sectionId, callback) => {
  // Callback signature: ( err, <json data from Canvas>)
  let endpoint = `courses/${courseId}/sections/${sectionId}`;
  let params = {
    'include[]': 'students'
  };
  return canvasApi.get(endpoint, params, callback);
};

exports.getAssignments = (courseId, callback) => {
  // Callback signature: ( err, <json data from Canvas>)
  let endpoint = `courses/${courseId}/assignments`;
  let params = {
    'include[]': 'overrides'
  };
  return canvasApi.get(endpoint, params, callback);
}

exports.getSectionSubmissions = (sectionId, callback) => {
  let endpoint = `sections/${sectionId}/students/submissions`;
  let params = {
    'student_ids[]': 'all',
    'grouped': true,
    'include[]': ['total_scores']
  };
  return canvasApi.get(endpoint, params, callback);
}

exports.getCourseSubmissions = (courseId, callback) => {
  let endpoint = `courses/${courseId}/students/submissions`;
  let params = {
    'student_ids[]': 'all'
  };
  return canvasApi.get(endpoint, params, callback);
}


exports.postAssignmentOverride = (courseId, sectionId, assignmentName, assignmentDescription, callback) => {
  // Add assignment with the specific name as an override to the given section.
  // 01.18.2019 tps Fix setting to show new assignments only to override section.
  let params = {
    assignment: {
      name: assignmentName,
      grading_type: 'pass_fail',
      submission_types: ['online_url'],
      published: true,
      description: assignmentDescription,
      assignment_overrides: [{ course_section_id: sectionId }],
      only_visible_to_overrides: true,
    }
  };

  return canvasApi.post(`courses/${courseId}/assignments`, params, callback);
}


//******************** Helper Functions ********************//
