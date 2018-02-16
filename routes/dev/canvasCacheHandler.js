/* Module containing functions that render Canvas cache page.
01.11.2018 tps Created.
01.17.2018 tps Add handler to prime the Canvas cache.
01.18.2018 tps Move readDirWithTimestamps() to canvasCache.js
01.24.2018 tps Handle query parameters for sort order of cache listing.
*/

const canvasCache = require('../../libs/canvasCache');
const canvasCachePrimer = require('../../libs/canvasCachePrimer');
// const fs = require('fs');


function get(req, res) {
  // Cache really comes from what's on disk
  // readDirWithTimestamps('./canvas_cache/', (err, files) => {
  canvasCache.readDiskCacheStats( (err, files) => {
    if (err) return res.render('dev/err', { err: err });

    // Total the file sizes
    var sizeTotal = 0;
    for (file of files) {
      sizeTotal += file.size;
    }

    // Sort file list based on "sort" query parameter

    function compareByField(fieldName) {
      // Return a compare function for array's sort() method.
      // Compare the values in the specified field on the array elements.
      return function (a, b) {
          if (a[fieldName] < b[fieldName]) {
            return -1;
          }
          if (a[fieldName] > b[fieldName]) {
            return 1;
          }
          // a must be equal to b
          return 0;
        }
    }

    switch(req.query.sort) {
      case 'size':
      case 'timestamp':
        files = files.sort(compareByField(req.query.sort));
        break;
      case 'age':
        files = files.sort(compareByField('timestamp')).reverse();
        break;
      default:
        // no-op. Files are already in key order
    }

    var params = {
      files: files,
      canvasCache: req.app.locals.canvasCache || {},
      fileSizeTotal: sizeTotal
    };
    return res.render('dev/canvasCache', params);
  });
}

function post(req, res) {
  // Clear cache object
  if (req.body.action === 'clearKey') {
    canvasCache.removeKey(req, req.body.cacheKey, (err) => {
      if (err) return res.render('dev/err', { err: err });
      return get(req, res);
    });
  } else {
    return get(req,res);
  }
}


function getPrimeTheCache(req, res) {
  return res.render('dev/primeCanvasCache');
}

function postPrimeTheCache(req, res) {
  // Start refreshing Canvas cache with new data
  canvasCachePrimer.start(req);
  return res.redirect(req.app.locals.APP_URL + 'dev/canvasCache');
}



//******************** Helper Async Functions ********************//

// function readDirWithTimestamps(dir, callback) {
//   // Callback signature: (err, <array of file objects>)
//   // File objects look like: { fileName: 'facultyList.json', timestamp: <file's timestamp> }
//   var fileObjs = [];

//   fs.readdir(dir, (err, files) => {
//     if (err) return callback(err);

//     // We only care about json files
//     files = files.filter( s => s.endsWith('.json'));

//     var iterationCount = 0; // Tells us when to stop iterations

//     // Closure that builds fileObjs list.
//     function iterate(fileName) {
//       // We're interested in the file timestamps as well
//       fs.stat(dir + fileName, (err, stat) => {
//         if (err) return callback(err);

//         fileObjs.push({
//           fileName: fileName,
//           timestamp: stat.mtime,
//           size: stat.size
//         });

//         if (++iterationCount >= files.length) {

//           // Return the files sorted by name
//           fileObjs.sort(fileNameCompare);
//           return callback(null, fileObjs);
//         }
//       });
//     }

//     for (var i = 0; i < files.length; ++i) {
//       iterate(files[i]);
//     }
//   });
// }

// //******************** Helper Functions ********************//

// function fileNameCompare(a, b) { 
//   // Sort objects in array by fileName property
//   var nameA = a.fileName;
//   var nameB = b.fileName;
//   if (nameA < nameB) {
//     return -1;
//   }
//   if (nameA > nameB) {
//     return 1;
//   }

//   // names must be equal
//   return 0;
// }


//******************** Exports ********************//

exports.get = get;
exports.post = post;
exports.getPrimeTheCache = getPrimeTheCache;
exports.postPrimeTheCache = postPrimeTheCache;