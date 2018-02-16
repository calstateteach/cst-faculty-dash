/* Module for managing file persistence & caching of a JSON object.
08.14.2017 tps Created.
01.10.2018 tps Used anywhere?
*/

const fs = require('fs');

var filePath = 'json.json';  // Path to JSON file.
var myJsonObj = null; // Most recent JSON objet read from file.


function readJsonFile(callback) {
  /* Return JSON object read from file into cache.
  Callback signature: (<error object>, <JSON object>)
  */
  console.log('Read JSON file ' + filePath);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.log(err);
      return callback(err);
    } else {
      try {
        myJsonObj = JSON.parse(data);
      } catch(e) {
        return callback(e, null);
      }
      return callback(null, myJsonObj);
    }
  }); // end readFile callback
}


function readJson(callback) {
  /* Return JSON object read from file or cache.
  callback signature: (<error object>, <JSON object>)
  */
  if (myJsonObj) {
    return process.nextTick(callback, null, myJsonObj);
  } else {
    return readJsonFile(callback);
  }
}

function saveJson(jsonObj, callback) {
  /* Write JSON config object to config file.
  Callback signature: (<Error object>)
  */
  console.log('Write JSON file ' + filePath);
  fs.writeFile(filePath, JSON.stringify(jsonObj, null, 2), 'utf8', (err) => {
    if (!err) {
      myJsonObj = jsonObj;
    }
    return callback(err);
  }); // end writeFile callback
};


//************************* Exports ***********************//

exports.setFile = function setFile(newFilePath) {
  // Allow clients to set path for config file.
  filePath = newFilePath;
  return exports;
}

exports.readJson = readJson;
exports.saveJson = saveJson;
exports.readJsonFile = readJsonFile;
