
var app = angular.module('mainApp', [
   'ui.router',
   'ui.bootstrap'
]);

app.constant("errMap", {
   missingField: 'Field missing from request: ',
   badValue: 'Field has bad value: ',
   notFound: 'Entity not present in DB',
   badLogin: 'Email/password combination invalid',
   dupEmail: 'Email duplicates an existing email',
   noTerms: 'Acceptance of terms is required',
   forbiddenRole: 'Role specified is not permitted.',
   noOldPwd: 'Change of password requires an old password',
   oldPwdMismatch: 'Old password that was provided is incorrect.',
   dupTitle: 'Conversation title duplicates an existing one',
   dupEnrollment: 'Duplicate enrollment',
   forbiddenField: 'Field in body not allowed.',
   queryFailed: 'Query failed (server problem).'
});

app.filter('tagError', ['errMap', function(errMap) {
   return function(err) {
      return errMap[err.tag] + (err.params.length ? err.params[0] : "");
   };
}]);

app.directive('cnvSummary', [function() {
   return {
      restrict: 'E',
      scope: {
         cnv: "=toSummarize"
      },
      template: '<a  href="#" ui-sref="cnvDetail({cnvId:{{cnv.id}}})">' +
       '{{cnv.title}} {{cnv.lastMessage | date : "medium"}}</a>'
   };
}]);
