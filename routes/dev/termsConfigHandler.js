/* Module containing functions that render terms configuration page.
01.01.2018 tps Created.
01.08.2018 tps Reload CAM data.
*/

function get(req, res) {
  req.app.locals.camData.readRows((err, statusCode, headers, rows) => {
    if (err) return res.render('dev/err', { err: err });

    var params = {
      camUrl: process.env.MENTOR_LIST_URL,
      statusCode: statusCode,
      headers: headers,
      camRows: rows,
    };
    return step_readModuleMap(req, res, params);
  });
}

function post(req, res) {
  // Reload CAM spreadsheet data
  req.app.locals.camData.reload();
  return get(req, res);
}


//******************** Helper Async Functions ********************//

function step_readModuleMap(req, res, params) {
  // Read term module map from file into JSON object.
  // Let page display errors reading module map.
  req.app.locals.moduleMap.readJson( (err, json) => {
    params.moduleMapErr = err;
    params.moduleMap = json;
    return res.render('dev/termsConfig', params);
  });
}


//******************** Exports ********************//

exports.get = get;
exports.post = post;
