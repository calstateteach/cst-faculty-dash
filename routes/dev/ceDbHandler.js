/* Handler functions CE Hours DB developer pages.
11.27.2017 tps Created.
02.15.2018 tps Test aggregator for all teacher candidates in DB.
*/
const CeHours     = require('../../libs_db/ce_hours_model');
const aggregator  = require('../../libs_db/ce_hours_aggregator');


function getTestCeDb(req, res) {
  // Retrieve list of candidates by their email.
  CeHours.distinct('candidateEmail', (err, distinctValues) => {
    if (err) return res.render('dev/err', {err: err});

    // Retrieve aggregated hours for each candidate.
    aggregator.run(distinctValues, (err, results) => {
      if (err) return res.render('dev/err', {err: err});
      return res.render('dev/testCeDb', { data: results});
    });    

  });
}

//******************** Exports ********************//
exports.getTestCeDb = getTestCeDb;
