angular.module('controllers', [])

.controller('ListCtrl', function($scope, $rootScope, $ionicLoading, $log, API) {
    console.log('ready');

    $scope.reports = {
        'markers': []
    };

    $scope.$on('g-places-autocomplete:select', function(event, place) {
        $scope.loading = $ionicLoading.show({
            content: 'Getting location...',
            showBackdrop: false
        });
        $scope.search.place = place.name + ", " + place.formatted_address;
        $scope.search.lat = place.geometry.location.lat();
        $scope.search.lng = place.geometry.location.lng();
        $scope.updateReportsInBounds();
        $ionicLoading.hide();
    });

    $scope.centerOnMe = function() {
        console.log('Getting current location');
        $scope.loading = $ionicLoading.show({
            content: 'Getting current location...',
            showBackdrop: false
        });
        navigator.geolocation.getCurrentPosition(function(pos) {
            console.log('Got pos', pos);
            $scope.search.place = 'My location';
            $scope.search.lat = pos.coords.latitude;
            $scope.search.lng = pos.coords.longitude;
            $scope.updateReportsInBounds();
            $ionicLoading.hide();
        }, function(error) {
            alert('Unable to get location: ' + error.message);
        });
    };

    $scope.updateReportsInBounds = function() {
        var lat = $scope.search.lat;
        var lng = $scope.search.lng;
        if (undefined === lat | undefined === lng) {
            return;
        }
        $scope.reports.markers = [];
        var promise = API.getReportsNearby($scope.search.lat, $scope.search.lng, 10);
        promise.then(
            function (payload) {
                console.log(payload);
                var reports = payload.data.reports;
                for (var i=0; i<reports.length; ++i) {
                    var report = reports[i];
                    var distance = (0 == report.distance) ? '<0.1' : report.distance;
                    var marker = {
                        latitude: report.lat,
                        longitude: report.lng,
                        title: report.place,
                        id: report.id,
                        distance: distance
                    };
                    $scope.reports.markers.push(marker);
                }
            },
            function (errorPayload) {
                $log.error('failure getting reports', errorPayload);
            }
        );
    };

    console.log('Centering');
    if (Object.keys($scope.search).length === 0) {
        $scope.centerOnMe();
    } else {
        $scope.updateReportsInBounds();
    }
})
