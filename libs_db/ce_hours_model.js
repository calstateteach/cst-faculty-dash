/* Definition of CeHours Mongoose model.
10.17.2017 tps
11.07.2017 tps Change activityDurationInMinutes into a virtual getter.
11.29.2017 tps Change activityDurationInMinutes back into a pre-calculated field,
               so that it can be used in aggregates.
*/

var mongoose = require('mongoose');
const dbConsts = require('./db_consts');


/******************** DB Schema ********************/

// Create schema for a CE hours document
var ceHoursSchema = mongoose.Schema( {
  timestamp: Date,
  candidateType: { type: String, enum: dbConsts.CANDIDATE_TYPES },
  // candidateFullName: String,
  candidateEmail: String,
  // mentorFullName: String,
  // mentorEmail: String,
  activityDate: Date,
  activityDescription: String,
  activityDurationAsString: String,
  activityDurationInMinutes: Number,
  otherParticipants: String,
  approvalState: { type: String, enum: dbConsts.APPROVAL_STATES },
  approvalRequestId: mongoose.Schema.Types.ObjectId
});


// ceHoursSchema.virtual('activityDurationInMinutes').get(function () {
//   /* Convert hours logged string to minutes. Hours logged may look like:
//     '30 Minutes'
//     '4 Hours 30 Minutes' 
//     '6 Hours
//     '1 Hour'
//     '1 Hour 30 Minutes'
//   */

//   var hours = 0;
//   var minutes = 0;
//   var timeParts = this.activityDurationAsString.split(' ');
//   if (timeParts[1] === 'Minutes') {
//     minutes = parseInt(timeParts[0]);
//   } else {
//     hours = parseInt(timeParts[0]);
//     minutes = (timeParts.length > 2) ? parseInt(timeParts[2]) : 0; 
//   }
//   return (hours * 60) + minutes;
// });

// Compile the schema into a model
var CeHours = mongoose.model('CeHours', ceHoursSchema);


/******************** Exports ********************/
module.exports = CeHours;
