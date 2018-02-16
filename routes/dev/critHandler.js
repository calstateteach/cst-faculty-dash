/* Handler functions for CritiqueIt API.
09.01.2017 tps Created.
*/
const critApi = require('../../libs/critiqueItApi');

function getStats(req, res) {
  critApi.getStats( (err, json) => {
    if (err) return res.redirect('err', { err: err });
    res.render('dev/critiqueItStats', { stats: json });
  }); // end callback
} // end function

//******************** Exports ********************//
exports.getStats = getStats;
