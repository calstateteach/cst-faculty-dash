/* Module to prime the Canvas cache by doing Canvas API queries for all
the Web app users.
01.17.2018 tps Created.
01.18.2018 tps Space out the Canvas API calls, to avoid getting 403 throttled error.
01.18.2018 tps Delete the disk cache before refilling it.
01.24.2018 tps Don't cache submissions data, which should always be current.
*/

const canvasCache = require('./canvasCache');

var facultyList = null;   // Save us a trip to the cache
var courses = null;
var displayCourses = [];
var iSupeCourses = [];

var startTime = null;   // Time the prime.


const DELAY = 1000; // Delay in milliseconds between API calls

function start(req) {
  startTime = new Date();
  console.log("Start priming the cache", startTime.toLocaleString());
  return step_deleteDiskCache(req);
}

function step_deleteDiskCache(req) {
  // Delete all files on disk to get rid of data
  // that may not be used by the current configuration.
  canvasCache.deleteDiskCache( () => {
    return step_getFacultyList(req);
  });
}

function step_getFacultyList(req) {
  canvasCache.getFacultyList(req, false, (err, json) => {
    if (err) console.log('Cache priming error:', err);
    facultyList = json;
    return step_getCourses(req);
  });
}


function step_getCourses(req) {

  function makeClosure() {
    return function() {
      canvasCache.getCourses(req, false, (err,json) => {
        if (err) console.log('Cache priming error:', err);
        courses = json;
        return step_getDisplayCourses(req);  
      });
    }
  }

  setTimeout(makeClosure(), DELAY);
}


function step_getDisplayCourses(req) {
 // List of courses we're tracking
  req.app.locals.moduleMap.readJson( (err, jsonConfig) => {
    for (term of jsonConfig) {
      var courseId = term.course_id;
      if (courseId && (!displayCourses.includes(courseId))) displayCourses.push(courseId);
    } 

    return step_getCourseModules(req);
  });
}


function step_getCourseModules(req) {
  
  var iterationCount = 0; // Continue after all iterated asyc calls are done
  var waitTime = 0;       // Milliseconds to wait before next Canvas call

  function makeClosure(courseId) {
    return function() {
      canvasCache.getModules(req, courseId, false, (err, json) => {
        if (++iterationCount >= displayCourses.length) {
          return step_getCourseAssignments(req);
        }
      });
    }
  }

  for (var i = 0; i < displayCourses.length; ++i) {
    setTimeout(makeClosure(displayCourses[i]), (++waitTime * DELAY));
  }
}


function step_getCourseAssignments(req) {

  var iterationCount = 0; // Continue after all iterated asyc calls are done
  var waitTime = 0;       // Milliseconds to wait before next Canvas call

  function makeClosure(courseId) {
    return function() {
      canvasCache.getAssignments(req, courseId, false, (err, json) => {
        if (++iterationCount >= displayCourses. length) {
          return step_getSections(req);
        }
      });    
    }
  }

  for (var i = 0; i < displayCourses.length; ++i) {
    setTimeout(makeClosure(displayCourses[i]), (++waitTime * DELAY));
  }
}


function step_getSections(req) {

  var iterationCount = 0; // Continue after all iterated asyc calls are done
  var waitTime = 0;       // Milliseconds to wait before next Canvas call

  function makeClosure(courseId, sectionId) {
    return function() {
      canvasCache.getSection(req, courseId,  sectionId, false, (err, json) => {
        if (++iterationCount >= facultyList.length) {
          // return step_getSectionSubmissions(req);
          return step_getISupeCourses(req);
        }
      });
    }
  }

  for (user of facultyList) {
    setTimeout(makeClosure(user.course_id, user.course_section_id), (++waitTime * DELAY));
  }
}


// function step_getSectionSubmissions(req) {

//   var iterationCount = 0; // Continue after all iterated asyc calls are done
//   var waitTime = 0;       // Milliseconds to wait before next Canvas call

//   function makeClosure(sectionId) {
//     return function() {
//       canvasCache.getSectionSubmissions(req, sectionId, false, (err, json) => {
//         if (++iterationCount >= facultyList.length) {
//           return step_getISupeCourses(req);
//         }
//       });
//     }
//   }

//   for (user of facultyList) {
//     setTimeout(makeClosure(user.course_section_id), (++waitTime * DELAY));
//   }
// }


function step_getISupeCourses(req) {
  // Locate each user's dedicated iSupervision course,
  // which we identify by its course title, which should look like:
  // "<faculty email login prefix>-iSupervision"

  for (user of facultyList) {
    const iSupeCourseName =  user.user.login_id.split('@')[0] + '-iSupervision';
    const iSupeCourse = courses.find(e => e.name === iSupeCourseName);
    
    // For convenience, store the iSupervision courses
    if (iSupeCourse && (!iSupeCourses.includes(iSupeCourse.id))) {
      iSupeCourses.push(iSupeCourse.id);
    }
  }

  // Now we're ready to use this list to populate iSupervision data caches
  return step_getISupeCourseEnrollments(req);
}


function step_getISupeCourseEnrollments(req) {

  var iterationCount = 0; // Continue after all iterated asyc calls are done
  var waitTime = 0;       // Milliseconds to wait before next Canvas call

  function makeClosure(courseId) {
    return function() {
      canvasCache.getCourseEnrollments(req, courseId, false, (err, json) => {
        if (++iterationCount >= iSupeCourses.length) {
          return step_getISupeCourseAssignments(req);
        }
      });
    }
  }

  for (id of iSupeCourses) {
    setTimeout(makeClosure(id), (++waitTime * DELAY));
  }
}

function step_getISupeCourseAssignments(req) {

  var iterationCount = 0; // Continue after all iterated asyc calls are done
  var waitTime = 0;       // Milliseconds to wait before next Canvas call

  function makeClosure(courseId) {
    return function() {
      canvasCache.getAssignments(req, courseId, false, (err, json) => {
        if (++iterationCount >= iSupeCourses.length) {
          // return step_getISupeCourseSubmissions(req);
          return finish()
        }
      });
    }
  }

  for (id of iSupeCourses) {
    setTimeout(makeClosure(id), (++waitTime * DELAY));
  }
}

// function step_getISupeCourseSubmissions(req) {

//   var iterationCount = 0; // Continue after all iterated asyc calls are done
//   var waitTime = 0;       // Milliseconds to wait before next Canvas call

//   function makeClosure(courseId) {
//     return function() {
//       canvasCache.getCourseSubmissions(req, courseId, false, (err, json) => {
//         if (++iterationCount >= iSupeCourses.length) {
//           finish()
//         }
//       });
//     }
//   }

//   for (id of iSupeCourses) {
//     setTimeout(makeClosure(id), (++waitTime * DELAY));
//   }
// }


function finish() {
  var endTime = new Date();
  return console.log("Done priming the cache", endTime.toLocaleString(), (endTime - startTime) / 1000 / 60, 'minutes');
}


//******************** Isolation Tests ********************//

// function isolationTest(req) {
//   console.log("Start priming the cache", new Date());
//   canvasCache.getFacultyList(req, true, (err, json) => {
//     if (err) console.log('Cache priming error:', err);
//     facultyList = json;
//     return step_isolateSectionSubmissions(req);
//   });
// }

// function step_isolateSectionSubmissions(req) {
//   var iterationCount = 0;
//   var secondsToWait = 0;


//   // Return a function with a closure that queries just one particular section
//   function querySection(section_id) {
//     return function() {
//       canvasCache.getSectionSubmissions(req, section_id, false, (err, json) => {
//         if (++iterationCount >= facultyList.length) {
//           return console.log("isolation test done");
//         }
//       });
//     }
//   }

//   for (user of facultyList) {  
//     setTimeout(querySection(user.course_section_id), (++secondsToWait * 1000));
//   }
// }



//******************** Exported Functions ********************//
// exports.start = isolationTest;
exports.start = start;