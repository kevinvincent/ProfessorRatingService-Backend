app.controller('registerController',
 ['$scope', '$state', '$http', 'notifyDlg',
 function($scope, $state, $http, nDlg) {
   $scope.user = {role: 0};
   $scope.errors = [];

   $scope.registerUser = function() {
      $http.post("Prss", $scope.user)
      .then(function() {
         return nDlg.show($scope, "Registration succeeded.  Login automatically?",
          "Login", ["Yes", "No"]);
      })
      .then(function(btn) {
         if (btn == "Yes")
            return $http.post("Ssns", $scope.user);
         else {
            $state.go('home');
         }
      })
      .then(function(response) {
          var location = response.headers().location.split('/');
          return $http.get("Ssns/" + location[location.length - 1]);
      })
      .then(function() {
          $state.go('home');
       })
      .catch(function(err) {
         $scope.errors = err.data;
      });
   };

   $scope.quit = function() {
      $state.go('home');
   };
}]);
