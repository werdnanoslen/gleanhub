angular.module('controllers')

.controller('ReportCtrl', function($rootScope, $scope, $ionicLoading, $log, $ionicPopup,
            $state, $ionicHistory, $ionicPopover, $location, uiGmapGoogleMapApi, API) {
    $scope.noGoingBack = (null === $ionicHistory.backView()) ? true : false;
    $scope.gotTemps = false;
    $scope.tempSeries = ['Temp'];
    $scope.tempLabels = [];
    $scope.tempData = [[]];
    $scope.latestHour = new Date().getHours();
    $scope.datasetOverride = [{
        "borderWidth": 3,
        "pointRadius": 0,
        "label": "Temperature, last 48 hrs"
    }];
    $scope.tempOptions = {
        scales: {
            xAxes: [{
                ticks: {
                    callback: function(value, index, values) {
                        if (values.length-1 == index) {
                            return "Now";
                        } else if (0 == index%8) {
                            return value;
                        } else if (0 == index%4) {
                            return "";
                        } else {
                            return null;
                        }
                    }
                }
            }],
            yAxes: [{
                ticks: {
                    callback: function(value, index, values) {
                        return value + "°";
                    }
                },
                id: 'Temp',
                label: 'Temperature',
                position: 'left',
                type: 'linear'
            }]
        }
    };
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
            $scope.form.smell = Boolean(report.smell);
            $scope.form.cleanFood = Boolean(report.cleanFood);
            $scope.map.center.latitude = report.lat;
            $scope.map.center.longitude = report.lng;
            $scope.map.search = {
                id: 'search',
                coords: {
                    latitude: report.lat,
                    longitude: report.lng
                }
            };
            if (report.photo !== null && report.photo.length > 0) {
                $scope.photoPreview = true;
            }

            var promise = API.getTemp48(report.lat, report.lng);
            promise.then(
                function (payload) {
                    var tempData = payload.data.tempData;
                    $scope.tempData = [tempData.temps];
                    $scope.tempLabels = [];
                    var date = new Date().setHours(tempData.time);
                    for (var i=0; i<tempData.temps.length; ++i) {
                        var hour = new Date(date - i*3600*1000).getHours();
                        if (hour > 12) {
                            hour = (hour - 12) + "pm";
                        } else if (hour == 0) {
                            hour = 12 + "am";
                        } else if (hour == 12) {
                            hour = 12 + "pm";
                        } else if (hour < 12) {
                            hour += "am";
                        }
                        $scope.tempLabels.unshift(hour);
                    }
                    $scope.gotTemps = true;
                },
                function (errorPayload) {
                    $log.error('failure fetching temp data', errorPayload);
                }
            );
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
