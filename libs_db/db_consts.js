/* Database field constants.
10.18.2017 tps Created.
*/

exports.PENDING   = 'Pending';
exports.APPROVED  = 'Approved';
exports.DENIED    = 'Denied';

exports.INTERN          = 'Intern';
exports.STUDENT_TEACHER = 'StudentTeacher';

exports.APPROVAL_STATES = [ exports.PENDING, exports.APPROVED, exports.DENIED ];
exports.CANDIDATE_TYPES = [ exports.INTERN, exports.STUDENT_TEACHER ];