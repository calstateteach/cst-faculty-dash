/* Express Router for development pages.
08.23.2017 tps Created.
11.27.2018 tps Add route for CE Hours DB connection page.
01.08.2017 tps Add routes for term configuration page.
01.11.2017 tps Add routes for Canvas cache page.
02.14.2018 tps coursesConfig page now obsolete.
*/

const express = require('express');
const router = express.Router();
const routeHandlers = require('./devHandlers');
// const coursesConfigHandler = require('./coursesConfigHandler');
const facultyListHandler = require('./facultyListHandler');
const clearCanvasDataHandler = require('../../libs/clearCanvasDataHandler');
const oauthFormHandler = require('./oauthFormHandler');
const critHandler = require('./critHandler');
const termsConfigHandler = require('./termsConfigHandler');
const canvasCacheHandler = require('./canvasCacheHandler');

router.use(require('./secureDevMiddleware'));

router.get('/home', routeHandlers.getHome);
router.get('/ltiForm', oauthFormHandler.getLtiForm);
router.post('/ltiForm', oauthFormHandler.postLtiForm);
router.get('/sessionData', routeHandlers.getSessionData);
router.get('/uuids', routeHandlers.getUuids);
router.post('/destroySession', routeHandlers.destroySession);
// router.get('/coursesConfig', coursesConfigHandler.get);
// router.post('/coursesConfig', coursesConfigHandler.put);
router.get('/facultyList', facultyListHandler);
router.post('/clearCanvasData', clearCanvasDataHandler);
router.get('/critiqueItStats', critHandler.getStats);
router.get('/testCeDb', require('./ceDbHandler').getTestCeDb);


router.get('/termsConfig',  termsConfigHandler.get);
router.post('/termsConfig', termsConfigHandler.post);

router.get('/canvasCache',  canvasCacheHandler.get);
router.post('/canvasCache',  canvasCacheHandler.post);

router.get('/primeCanvasCache', canvasCacheHandler.getPrimeTheCache);
router.post('/primeCanvasCache', canvasCacheHandler.postPrimeTheCache);

exports.router = router;
