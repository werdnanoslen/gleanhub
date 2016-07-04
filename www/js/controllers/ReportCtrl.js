angular.module('controllers')

.controller('ReportCtrl', function($rootScope, $scope, $ionicLoading, $log, $ionicPopup,
            $state, $ionicHistory, $ionicPopover, $location, uiGmapGoogleMapApi, API) {
    $scope.noGoingBack = (null === $ionicHistory.backView()) ? true : false;
    $scope.map = {
        center: {
            latitude: 0,
            longitude: 0
        },
        markers: {
            options: {
                icon: {
                    url: 'img/location.png',
                    scaledSize: new google.maps.Size(50, 50), // scaled size
                }
            }
        },
        options: {
            disableDefaultUI: true,
            disableDoubleClickZoom: true,
            draggable: false
        },
        zoom: 15
    };
    $ionicPopover.fromTemplateUrl('templates/share.html', {
        scope: $scope,
    }).then(function(popover) {
        $scope.popover = popover;
    });
    $scope.location = encodeURIComponent($location.absUrl());

    var promise = API.getReport($state.params.reportId);
    promise.then(
        function (payload) {
            var report = payload.data.report[0];
            $scope.form = report;
            $scope.map.center.latitude = report.lat;
            $scope.map.center.longitude = report.lng;
            $scope.map.search = {
                id: 'search',
                coords: {
                    latitude: report.lat,
                    longitude: report.lng
                }
            };
        },
        function (errorPayload) {
            $log.error('failure fetching report', errorPayload);
        }
    );

    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        $scope.noGoingBack = (null === $ionicHistory.backView()) ? true : false;
    });

    $scope.showActiveQuestion = function() {
        var confirmPopup = $ionicPopup.confirm({
            title: 'Report this as inactive?',
            buttons: [
                {
                    text: 'Cancel',
                    type: 'button-light'
                },
                {
                    text: 'Yes',
                    type: 'button-positive',
                    onTap: function(e) {
                        var id = $state.params.reportId
                        var update = {
                            active: 0
                        }
                        var promise = API.updateReport(id, update);
                        promise.then(
                            function (payload) {
                                $log.log('op is over');
                                $ionicLoading.show({
                                    template: 'Thanks, this report won\'t show up anymore',
                                    duration: 2000
                                });
                            },
                            function (errorPayload) {
                                $log.error('failure updating report', errorPayload);
                                $ionicLoading.show({
                                    template: 'Sorry, there was an error',
                                    duration: 2000
                                });
                            }
                        );
                    }
                }
            ]
        });
    };
});
