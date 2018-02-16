/* Entry point for development of secured version of CST faculty dashboard.
08.23.2017 tps Created.
08.25.2017 tps Include dashboard router.
09.12.2017 tps Use MongoDB for session store.
09.16.2017 tps Make use of default session store a configurable item.
11.27.2017 tps Configure session name externally.
11.27.2017 tps Configure app port externally.
12.28.2017 tps Set TTL for sessions.
01.01.2018 tps Add APP_URL local for building app's URL paths.
01.18.2018 tps Start timer that periodically primes the cache.
01.24.2018 tps Move cache timer to module libs/canvasCacheTimer.js
*/
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser')
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const app = express();
const JsonFile = require('./classes/JsonFile');
// const canvasCache = require('./libs/canvasCache');
// const cachePrimer = require('./libs/canvasCachePrimer');


//******************** Constants********************//
const APP_PORT = process.env.APP_PORT;
// const APP_PORT = 4321;  // Should be configurable
// const CONFIG_FILE = 'config/coursesConfig.json';
const MODULE_MAP_FILE = 'config/module_term_mapping.json';


//******************** Configure Web app ********************//
app.set('view engine', 'pug');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));

var sessionOptions = {
  // name: 'server-session-cookie-id',
  name: process.env.CST_COOKIE_NAME,
  secret: process.env.CST_COOKIE_SECRET,
  saveUninitialized: false,
  resave: false,
  cookie: {
    httpOnly: true,
    secure: 'auto'
  }
};
// By default, use MongoDB as session store
if (process.env.USE_DEFAULT_SESSION_STORE !== 'True') {
  sessionOptions.store = new MongoStore({
    url: process.env.CST_MONGODB_SESSION_STORE,
    ttl: 2 * 24 * 60 * 60  // Sessions expire in 2 days.
  });
}
app.use(session(sessionOptions));

// Configure for use from behind a proxy.
app.set('trust proxy', true);
app.set('trust proxy', 'loopback');


//******************** Globally Available Data ********************//

// Term modules maps
app.locals.moduleMap = new JsonFile.JsonFile(MODULE_MAP_FILE);

// Courses to display in dashboard 01.10.2018 tps This data now read from moduleMap.
// app.locals.config = new JsonFile.JsonFile(CONFIG_FILE);

// CAM data
app.locals.camData = require('./libs/camData');

// URL location of Web app. Use to build URL links when app is
// running under a reverse proxy server.
// e.g. "https://fdb.calstateteach.net/cehours/"
app.locals.APP_URL = process.env.APP_URL;

// Setting to prevent myself from accidentally adding iSupervision 
// assignments when looking at live data.
// If this is not specified, default is to allow adds.
app.locals.DISABLE_ADD = (process.env.DISABLE_ADD === 'True');


//******************** Configure Routers ********************//
app.use('/', require('./routes/root/rootRoutes').router);
app.use('/dev', require('./routes/dev/devRoutes').router);
app.use('/dash', require('./routes/dash/dashRoutes').router);


//******************** Define App Startup ********************//
function startWebApp() {
  app.listen(APP_PORT, function() {
    console.log('listening on', APP_PORT);

    // Periodically prime the Canvas data cache
    require('./libs/canvasCacheTimer').start(app);

    // /* Periodically check the oldest data in the disk cache
    // and prime the cache if it is too old.
    // */
    // const cacheIntervalMs = 1000 * 60 * 60 * 1;   // 1 hour
    // const maxCacheAgeMs   = 1000 * 60 * 60 * 8;   // 8 hours
    // const cacheTimer = setInterval(function() {

    //   console.log('Checking disk cache', (new Date()).toLocaleString());
    //   canvasCache.getOldestTimestamp( (err, oldestTime) => {
    //     if (err) return log.console('cacheTimer error calling getOldestTimestamp', err);

    //     var ageInMs = (new Date()) - oldestTime;

    //     // console.log('oldest time stamp', oldestTime.toLocaleString());
    //     // console.log('ageInMs', ageInMs, maxCacheAgeMs);

    //     if (ageInMs > maxCacheAgeMs) {
    //        // Fake request object so that cachePrimer can access app locals
    //        var req = {};
    //       req['app'] = app;
    //       cachePrimer.start(req);
    //     }
    //   });
    // }, cacheIntervalMs);

    // // Make sure to clear timers
    // process.on('SIGINT', function() {
    //   clearInterval(cacheTimer);
    // });

  });
}

//******************** CE Hours Store Configuration ********************//
// Start the Web app after we've made a connection to the CE Hours store
require('./libs_db/db_access').connect(startWebApp);
