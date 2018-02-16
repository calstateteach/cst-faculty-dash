/* Class for managing persistence of a JSON object read from a file.
01.01.2018 tps Created from libs/jsonFileHelper.
*/

const fs = require('fs');

class JsonFile {
  
  constructor(filePath) {
    this.filePath = filePath;
    this.myJsonOb = null;   // Lazily load this only when asked.
    this.fileTimestamp = null;
    // What, no private members?
  }  

  readJsonFile(callback) {
    /* Return JSON object read from file into cache.
    Callback signature: (<error object>, <JSON object>)
    */
    // console.log('Read JSON file ' + this.filePath);
    fs.readFile(this.filePath, 'utf8', (err, data) => {
      if (err) {
        // console.log(err);
        return callback(err);
      } else {
        try {
          this.myJsonObj = JSON.parse(data);
        } catch(e) {
          return callback(e, null);
        }

        // Retrieve a timestamp for the file data
        fs.stat(this.filePath, (err, stat) => {
          if (err) return callback(err);
          this.fileTimestamp = stat.mtime;

          return callback(null, this.myJsonObj);
        });
      }
    }); // end readFile callback
  }


  readJson(callback) {
    /* Return JSON object read from file or cache.
    callback signature: (<error object>, <JSON object>)
    */
    if (this.myJsonObj) {
      return process.nextTick(callback, null, this.myJsonObj);
    } else {
      return this.readJsonFile(callback);
    }
  }


  saveJson(jsonObj, callback) {
    /* Write JSON config object to config file.
    Callback signature: (<Error object>)
    */
    // console.log('Write JSON file ' + this.filePath);
    fs.writeFile(this.filePath, JSON.stringify(jsonObj, null, 2), 'utf8', (err) => {
      if (!err) {
        this.myJsonObj = jsonObj;
        this.fileTimestamp = new Date();
      }
      return callback(err);
    }); // end writeFile callback
  }




  delJsonFile(callback) {
    /* Delete JSON file from disk as well as cached object.
    Callback signature: (<Error object>)
    */
    fs.unlink(this.filePath, (err) => {
      // console.log('Delete JSON file', this.filePath);
      // console.log('unlink error', err);
      
      // I don't care if the file didn't exist to start with
      if (err && (err.code != 'ENOENT')) return callback(err);
      
      this.myJsonObj = null;
      return callback(null);
    });
  }
  

  //************************* Accessors ************************//

  get json() {
    // Return cached JSON object, if any.
    return this.myJsonObj;
  }


  get timestamp() {
    return this.fileTimestamp;
  }

  get file() {
    return this.filePath;
  }

} // end class




//************************* Exports ***********************//

exports.JsonFile = JsonFile;
