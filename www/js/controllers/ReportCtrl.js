angular.module('controllers', [])

.controller('ReportCtrl', function($rootScope, $scope, $ionicLoading, $log, $ionicPopup, uiGmapGoogleMapApi, $state, API) {
    $scope.map = {
        center: {
            latitude: 0,
            longitude: 0
        },
        options: {
            disableDefaultUI: true,
            disableDoubleClickZoom: true,
            draggable: false
        },
        zoom: 15
    };
    var promise = API.getReport($state.params.reportId);
    promise.then(
        function (payload) {
            var report = payload.data.report[0];
            $scope.form = report;
            $scope.map.center.latitude = report.lat;
            $scope.map.center.longitude = report.lng;
        },
        function (errorPayload) {
            $log.error('failure fetching report', errorPayload);
        }
    );

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
