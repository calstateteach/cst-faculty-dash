/* Helpers functions that generate dummy LTI POST data for testing.
07.08.2017 tps Created
08.25.2017 tps Use environment configuration for some fields.
02.15.2018 tps Obscure with dummy data for storage in public repo.
               See oauthDummyData.js.secret for valid test values.
*/
const uuidv1 = require('uuid/v1');
const base64 = require('base-64');
var oauth = require('oauth-sign/index.js')
  , hmacsign = oauth.hmacsign;

exports.makeSignedParams = () => {
  // Generate data for a test form that contains valid signed POST parameters.
  var postParams = {
    oauth_consumer_key: process.env.CST_LTI_CONSUMER_KEY,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: '1498690936',
    oauth_nonce: 'SecretSquirrel',
    oauth_version: '1.0',
    context_id: 'SecretSquirrel',
    context_label: 'Pilot',
    context_title: 'Pilot Test',
    custom_canvas_account_id: '3',
    custom_canvas_account_name: 'Manually-Created Courses',
    custom_canvas_api_baseurl: 'https://calstateteach.test.instructure.com',
    custom_canvas_api_domain: 'calstateteach.test.instructure.com',
    custom_canvas_course_id: '39',
    custom_canvas_course_name: 'Pilot Test',
    custom_canvas_course_uuid: 'SecretSquirrel',
    custom_canvas_enrollment_state: 'active',
    custom_canvas_membership_roles: 'StudentEnrollment,Account Admin',
    custom_canvas_user_id: '696',
    custom_canvas_user_login_id: 'SecretSquirrel@SecretSquirrel.net',
    custom_canvas_user_uuid: 'SecretSquirrel',
    custom_canvas_workflow_state: 'available',
    custom_person_name_full: 'SecretSquirrel',
    ext_roles: 'urn:lti:instrole:ims/lis/Administrator,urn:lti:instrole:ims/lis/Student,urn:lti:role:ims/lis/Learner,urn:lti:sysrole:ims/lis/User',
    launch_presentation_document_target: 'iframe',
    launch_presentation_height: '400',
    launch_presentation_locale: 'en',
    launch_presentation_return_url: 'https://SecretSquirrel.com/courses/39/external_content/success/external_tool_redirect',
    launch_presentation_width: '800',
    lis_course_offering_sourcedid: 'Pilot-Test-Course',
    lis_person_contact_email_primary: 'SecretSquirrel@SecretSquirrel.net',
    lis_person_name_family: 'SecretSquirrel',
    lis_person_name_full: 'SecretSquirrel SecretSquirrel',
    lis_person_name_given: 'SecretSquirrel',
    lis_person_sourcedid: 'SecretSquirrel@SecretSquirrel.net',
    lti_message_type: 'basic-lti-launch-request',
    lti_version: 'LTI-1p0',
    oauth_callback: 'about:blank',
    resource_link_id: 'SecretSquirrel',
    resource_link_title: 'LIT Test App',
    roles: 'Learner,urn:lti:instrole:ims/lis/Administrator',
    tool_consumer_info_product_family_code: 'canvas',
    tool_consumer_info_version: 'cloud',
    tool_consumer_instance_contact_email: 'notifications@instructure.com',
    tool_consumer_instance_guid: 'SecretSquirrel',
    tool_consumer_instance_name: 'SecretSquirrel',
    user_id: 'SecretSquirrel',
    user_image: 'https://secure.gravatar.com/avatar/4d2d58265ab51da0eaf0d0ffe056490a?s=50&d=https%3A%2F%2Fcanvas.instructure.com%2Fimages%2Fmessages%2Favatar-50.png'
    //oauth_signature: 'SecretSquirrel'
  };

  return exports.signParams(postParams);
}

exports.signParams = (postParams) => {
  // Oauth sign a set of POST parameters.

  // Generate a fresh nonce.
  postParams['oauth_nonce'] = base64.encode(uuidv1());

  // Generate a fresh timestamp.
  postParams['oauth_timestamp'] =
    (Math.round(Date.now() / 1000)).toString();

  // Sign the parameters.
  postParams['oauth_signature'] = hmacsign(
    'POST',
    process.env.CST_LTI_LAUNCH_URL,
    postParams,
    process.env.CST_LTI_CONSUMER_SECRET);

  return postParams;
}
