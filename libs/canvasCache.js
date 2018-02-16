/* Module that implements a cache for Canvas data.
In order to preserve the cache between app start-ups, cached data is written
out to JSON files as well as being stored in an Express locals variable.
01.09.2018 tps Created.
01.17.2018 tps Add parameter to specify forcing new query.
01.18.2018 tps Add utility function readDiskCacheStats();
01.24.2018 tps Submission data should always be current, so don't cache it.
*/

const canvasApi = require('./canvasApiTiny');
const JsonFile = require('../classes/JsonFile');
const canvasQuery = require('./canvasQuery');
const fs = require('fs');

const CACHE_DIR = 'canvas_cache/';

//******************** Exported Functions ********************//

exports.getFacultyList = (req, useCache, callback) => {
  // Calback signature: (err, json)
  return getCachedQuery(
    req,
    'facultyList',
    (function(f) { return step_getDisplayCourses(req, f); }),
    useCache, 
    callback
  );
};


exports.getCourses = (req, useCache, callback) => {
  // Calback signature: (err, json)
  return getCachedQuery(
    req,
    `courses`,
    canvasQuery.getCourses,
    useCache, 
    callback
    );
};


exports.getCourseEnrollments = (req, courseId, useCache, callback) => {
  // Calback signature: (err, json)
  return getCachedQuery(
    req,
    `courses_${courseId}_enrollments`,
    (function(f) { return canvasQuery.getCourseEnrollments(courseId, f); }),
    useCache, 
    callback
  );
};


exports.getSection = (req, courseId, sectionId, useCache, callback) => {
  return getCachedQuery(
    req,
    `courses_${courseId}_sections_${sectionId}`,
    (function(f) { return canvasQuery.getSection(courseId, sectionId, f); }),
    useCache, 
    callback
  );
};

exports.getModules = (req, courseId, useCache, callback) => {
  return getCachedQuery(
    req,
    `courses_${courseId}_modules`,
    (function(f) { return canvasQuery.getModules(courseId, f); }),
    useCache, 
    callback
    );
};

exports.getAssignments = (req, courseId, useCache, callback) => {
  return getCachedQuery(
    req,
    `courses_${courseId}_assignments`,
    (function(f) { return canvasQuery.getAssignments(courseId, f); }),
    useCache, 
    callback
  );
};

exports.getSectionSubmissions = (req, sectionId, useCache, callback) => {
  return canvasQuery.getSectionSubmissions(sectionId, callback);
  // return getCachedQuery(
  //   req,
  //   `sections_${sectionId}_students_submissions`,
  //   (function(f) { return canvasQuery.getSectionSubmissions(sectionId, f); }),
  //   useCache, 
  //   callback
  // );
};

exports.getCourseSubmissions = (req, courseId, useCache, callback) => {
 return canvasQuery.getCourseSubmissions(courseId, callback);
  // return getCachedQuery(
  //   req,
  //   `courses_${courseId}_students_submissions`,
  //   (function(f) { return canvasQuery.getCourseSubmissions(courseId, f); }),
  //   useCache, 
  //   callback
  // );  
};


exports.removeKey = removeKey;


exports.addAssignmentOverride = (req, courseId, sectionId, name, description, callback) => {
  // Calback signature: (err, json)
  canvasQuery.postAssignmentOverride(courseId, sectionId, name, description, (err, json) => {
    if (err) return callback(err);

    // Invalidate the appropiate caches
    return step_clearCourseAssignments(req, courseId, json, callback);
  });
};


exports.readDiskCacheStats = (callback) => {
  // Retrieve file stats for cached data on disk.
  // Callback signature: (err, <array of file objects>)
  // File objects contain: file name, time stamp, file size
  var fileObjs = [];

  fs.readdir(CACHE_DIR, (err, files) => {
    if (err) return callback(err);

    // We only care about json files
    files = files.filter( s => s.endsWith('.json'));

    // There may be no files, in which we can return now
    if (files.length <= 0) {
      return callback(null, files);
    }

    var iterationCount = 0; // Tells us when to stop iterations

    // Closure that builds fileObjs list.
    function iterate(fileName) {
      // We're interested in the file timestamps as well
      fs.stat(CACHE_DIR + fileName, (err, stat) => {
        if (err) return callback(err);

        fileObjs.push({
          fileName: fileName,
          timestamp: stat.mtime,
          size: stat.size
        });

        if (++iterationCount >= files.length) {

          // Return the files sorted by name
          fileObjs.sort(fileNameCompare);
          return callback(null, fileObjs);
        }
      });
    }

    for (var i = 0; i < files.length; ++i) {
      iterate(files[i]);
    }
  });
};


exports.getOldestTimestamp = (callback) => {
  // Retrieve the oldest timestamp from the disk cache.
  // Callback signature: (err, Date)

  exports.readDiskCacheStats( (err, files) => {
    if (err) callback(err);

    var oldestTime = new Date();
    for (file of files) {
      if (file.timestamp < oldestTime) {
        oldestTime = file.timestamp;
      }
    }
    callback(null, oldestTime);
  });
};


exports.deleteDiskCache = (callback) => {
  // Delete json files on disk.
  // Writes errors to console but doesn't return them. 
  // Callback signature: ()

  fs.readdir(CACHE_DIR, (err, files) => {
    if (err) {
      console.log('deleteDiskCache readdir err:', err);
      return callback();
    }

    // We only care about json files
    files = files.filter( s => s.endsWith('.json'));

    // If there are no files to delete, we can return now
    if (files.length <= 0) {
      return callback();
    }

    var iterationCount = 0; // Tells us when to stop iterations
    for (var filename of files) {
      fs.unlink(CACHE_DIR + filename, (err) => {
        if (err) console.log('unlink err', err);

        if (++iterationCount >= files.length) {
          return callback();
        }
      });
    }
  });
};


//******************** Helper Functions ********************//

function getCachedQuery(req, cacheKey, canvasQuery, useCache, callback) {
  /* Retrieves cached Canvas query data from a local cache object.
  req: Express request environment, so we can get the Express locals,
       which is where the cache object is stored.
  cacheKey: Key for identifying cached Canvas data in the cache object.
            Keys must be valid file names, since they are used as file
            names for data written out to disk. 
            Keys are expected to look like Canvas API URL endpoints.
            e.g. "courses_52_sections_371"
  canvasQuery: Function with signature (callback) which does the work 
               of the Canvas API query.
  useCache: True to retrieve data from cache if possible.
            False to retrieve data from Canvas & store in cache.
  callback: Function to use to return retrieved data from cache.
            Function signature: (err, <JSON obj>)
  */

  // Make sure cache object exists
  req.app.locals.canvasCache = req.app.locals.canvasCache || {};
  var cache = req.app.locals.canvasCache;

  if (useCache) {
    // Check memory cache first
    if (cache[cacheKey]) {
      return process.nextTick(callback, null, cache[cacheKey].json);
    }

    // If not in the memory cache, try disk cache
    var jsonFile = new JsonFile.JsonFile(CACHE_DIR + cacheKey + '.json');
    jsonFile.readJson( (err, json) => {
      // If not on disk, query the Canvas API
      if (err && (err.code = 'ENOENT')) {
        // console.log(err.toString());
        canvasQuery( (err, json) => {
          if (err) return callback(err);

          // Save in the memory cache
          cache[cacheKey] = jsonFile;

          // Save on disk
          jsonFile.saveJson(json, (err) => {
            if (err) return callback(err);
            return callback(null, json);
          });
        });

      } else if (err) {
        return callback(err); // Some other unexpected error happened
      } else {
        cache[cacheKey] = jsonFile;   // Save in memory cache

        // Return what we found on disk
        return callback(null, json);
      }
    }); // End trying to retrieve from disk cache

  } else {    // Do a fresh Canvas API query
    var jsonFile = new JsonFile.JsonFile(CACHE_DIR + cacheKey + '.json');
    canvasQuery( (err, json) => {
      if (err) return callback(err);

      // Save in the memory cache
      cache[cacheKey] = jsonFile;

      // Save on disk
      jsonFile.saveJson(json, (err) => {
        if (err) return callback(err);
        return callback(null, json);
      });
    });
  }
}


function removeKey(req, cacheKey, callback) {
  // Callback signature: (err)

  // Make sure cache object exists
  req.app.locals.canvasCache = req.app.locals.canvasCache || {};

  // Remove object from cache by removing both its disk on file
  // and its key in the cache object.
  var cache = req.app.locals.canvasCache;
  if (cache[cacheKey]) {
    cache[cacheKey].delJsonFile((err) => {
      delete cache[cacheKey];
      return callback(err);
    });
  } else {
    // There might still be a file on disk that was never
    // read into the memory cache.
    var jsonFile = new JsonFile.JsonFile(CACHE_DIR + cacheKey + '.json');
    jsonFile.delJsonFile((err) => {
      return callback(err);
    });
  }
};


function fileNameCompare(a, b) { 
  // Sort objects in array by fileName property
  var nameA = a.fileName;
  var nameB = b.fileName;
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }

  // names must be equal
  return 0;
}


function step_clearCourseAssignments(req, courseId, json, callback) {
  // Callback signature: (err, <json obj>)
  removeKey(req, `courses_${courseId}_assignments`, (err) => {
    if (err) return callback(err);
    return step_clearCourseSubmissions(req, courseId, json, callback)
  });
}


function step_clearCourseSubmissions(req, courseId, json, callback) {
  // Callback signature: (err, <json obj>)
  removeKey(req, `courses_${courseId}_students_submissions`, (err) => {
    if (err) return callback(err);
    return callback(null, json);
  });
}


//******************** Helper Data Functions ********************//

function step_getDisplayCourses(req, callback) {

  // List of courses to query for faculty is derived from module map.
  req.app.locals.moduleMap.readJson( (err, jsonConfig) => {
    var courseList = [];
    for (term of jsonConfig) {
      var courseId = term.course_id;
      if (courseId && (!courseList.includes(courseId))) courseList.push(courseId);
    }

    // kick off series of async calls to gather faculty enrollments.
    accumulateFacultyList(courseList, 0, [], (err, json) => {

      // Inovke callback with retrieved data
      return callback(err, json);
    });
  });
}


function compareEnrollees(a, b) {
  /* Helper function for sorting an enrollee list. */
  var nameA = a.user.sortable_name;
  var nameB = b.user.sortable_name;
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }

  return 0; // names must be equal
}


function accumulateFacultyList(idList, currentIndex, accumulatedResult, callback) {

  function iterator(err, results) {
    if (err) return callback(err);

    // Gather the records so far.
    accumulatedResult = accumulatedResult.concat(results);

    // We can stop if we have no more records to gather
    if (++currentIndex >= idList.length) {

      // Store names in alphabetical order
      accumulatedResult.sort(compareEnrollees);

      return callback(null, accumulatedResult);
    } else {
      // Otherwise, keep going.
      accumulateFacultyList(idList, currentIndex, accumulatedResult, callback);
    }
  } // end iterator definition

  // Query for one course's faculty enrollees on each iteration
  return canvasQuery.getCourseFaculty(idList[currentIndex], iterator);
}


