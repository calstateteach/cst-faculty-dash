/* Module containing functions for MongoDB access.
10.10.2017 tps
10.18.2017 tps Moved schema-specific code to separate modules.
10.19.2017 tps Read connection string from env variable.
11.27.2017 tps Added to Faculty Dashboard App.
*/


/******************** DB Connection ********************/

const CONNECTION_STRING = process.env.CE_HOURS_STORE;

var mongoose = require('mongoose');

mongoose.Promise = global.Promise;
  // To get rid of DeprecationWarning warning.

mongoose.connect(CONNECTION_STRING, { useMongoClient: true });
  // Use Mongo client to circumvent deprecation warning.

// We're ready to start using the DB
var db = mongoose.connection;


/******************** DB Configuration ********************/

function setEventHandlers(openDbEventHandler) {
  // Callback signature: function()

  // Log database events to the console for debugging purposes
  db.on('open', function () {  
    console.log("Mongoose open event");
    openDbEventHandler();
  });

  db.on('close', function () {  
    console.log("Mongoose close event"); 
  });
  db.on('connected', function () {  
    console.log("Mongoose connected event");
  }); 
  db.on('disconnected', function () {  
    console.log("Mongoose disconnected event"); 
  });

  //Bind connection to error event (to get notification of connection errors)
  db.on('error', console.error.bind(console, 'MongoDB connection error:'));

  // If the Node process is interrupted, close the Mongoose connection
  process.on('SIGINT', function() {
    console.log('SIGINT received');
    shutdownDb();
  });

}


/******************** DB Utility Functions ********************/

function shutdownDb() {
  db.close(function () {
    console.log('Mongoose disconnected on app termination');
    process.exit(0);
  });
}

// function openDbEventHandler() {
//   console.log("openEventHandler")
//   step1(done);  // Start working once the db connnection is established
// }


/****************** Module Exports ******************/

exports.connect = setEventHandlers;
exports.shutdown = shutdownDb;
