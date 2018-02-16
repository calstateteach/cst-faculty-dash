/* Express Router for root pages.
08.24.2017 tps Created.
*/

const express = require('express');
const router = express.Router();
const rootHandlers = require('./rootHandlers');

router.get('/devlogin', rootHandlers.getDevLogin);
router.post('/devlogin', rootHandlers.validateLogin);
router.get('/badRequest', rootHandlers.badRequest);
router.post('/lti', require('./ltiLaunchHandler'));
// router.post('/lti', require('./ltiLaunchTestHandler'));

exports.router = router;
