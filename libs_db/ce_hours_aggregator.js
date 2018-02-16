/* Utility functions for retrieving aggregate CE Hours data for dashboard.
11.27.2017 tps Created.
*/

const CeHours = require('./ce_hours_model');
const CONSTS = require('./db_consts');


/****************** Async DB Access Functions ******************/

function run(emailList, callback) {
  // emailList: Array of candidate email addresses identifying candidates we want the hours for.
  // Callback signature: (err, results)

  // Get total CE minutes per candidate in the list, per approval state,
  // reduced to hours.
  var pipes = [

    // Select specified candidates
    { $match: { candidateEmail: { $in: emailList} } },

    // Sum CE hours for each candidate by approval state 
    { $group: {
        _id: { candidateEmail: '$candidateEmail', approvalState: '$approvalState'}, 
        totalMinutes: { $sum: '$activityDurationInMinutes'}
        }
    },

    // Report as hours
    { $project: {
        totalMinutes: 1,
        totalHours: { $divide: [ '$totalMinutes', 60.0 ] }
        }
    }
  ];
  CeHours.aggregate(pipes, callback);
}


/****************** Helper Functions ******************/


// parseActivityMinutes(activityDurationAsString) {
//   /* Convert hours logged string to minutes. Hours logged may look like:
//     '30 minutes'
//     '4 Hours 30 Minutes' 
//     '6 Hours
//     '1 Hour'
//     '1 Hour 30 Minutes'
//   */

//   var hours = 0;
//   var minutes = 0;
//   var timeParts = activityDurationAsString.split(' ');
//   if (timeParts[1] === 'Minutes') {
//     minutes = parseInt(timeParts[0]);
//   } else {
//     hours = parseInt(timeParts[0]);
//     minutes = (timeParts.length > 2) ? parseInt(timeParts[2]) : 0; 
//   }
//   return (hours * 60) + minutes;
// });

/****************** Module Exports ******************/
exports.run = run;
