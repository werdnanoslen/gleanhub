angular.module('controllers', [])

.controller('MapCtrl', function($scope, $rootScope, $ionicLoading, $state, $log,
        uiGmapGoogleMapApi, uiGmapIsReady, API) {
    var geocoder = new google.maps.Geocoder();
    var filterCriteria;
    $scope.Gmap;
    $scope.mapReady = false;
    $scope.centerSetByPlaceClick = false;
    $scope.search = {};
    $scope.reports = {
        'markers': []
    };
    $scope.map = {
        center: {
            latitude: 0,
            longitude: 0
        },
        events: {
            dragend: function(map) {
                $scope.updateBounds(map);
            },
            zoom_changed: function(map) {
                $scope.updateBounds(map);
            }
        },
        markersEvents: {
            click: function(gMarker, eventName, model) {
                $state.go('report', {reportId: model.id});
            }
        },
        options: {
            disableDefaultUI: true
        },
        zoom: 15
    };

    uiGmapGoogleMapApi.then(function(uiMap) {
        $scope.mapReady = true;
        $scope.centerMap();
        $scope.overrideInfoWindowClick();
        $scope.updateReportsInBounds();
    });

    $scope.$on('$stateChangeSuccess', function(event,toState,toParams,fromState) {
        // "" for name indicates that it's the initial transition.
        // Not ideal, but that's how Angular works atm :/
        // https://github.com/angular-ui/ui-router/issues/1307#issuecomment-59570535
        if ('' !== fromState.name && 'map' === toState.name) {
            if ($scope.mapReady) {
                $scope.centerMap();
                $scope.updateReportsInBounds();
            }
        }
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
            $scope.map.position = {
                id: 'position',
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillOpacity: 1.0,
                    fillColor: '#4D90FE',
                    strokeColor: '#ffffff',
                    strokeWeight: 2.0,
                    scale: 7
                },
                coords: {
                    latitude: $scope.search.lat,
                    longitude: $scope.search.lng
                }
            };
            $scope.centerMap();
            $scope.updateReportsInBounds();
            $ionicLoading.hide();
        }, function(error) {
            alert('Unable to get location: ' + error.message);
        });
    };

    $scope.centerMap = function() {
        console.log('Centering');
        if (Object.keys($scope.search).length === 0) {
            $scope.centerOnMe();
        } else {
            $scope.map.center.latitude = $scope.search.lat;
            $scope.map.center.longitude = $scope.search.lng;
            $scope.updateReportsInBounds();
        }
    };

    $scope.filterReports = function() {
        if (undefined !== filterCriteria) {
            console.log('filtering by \'' + filterCriteria + '\'');
            var promise = API.getReports({"*": filterCriteria});
            promise.then(
                function (payload) {
                    var reports = payload.data.reports;
                    var markers = $scope.reports.markers;
                    $scope.reports.markers = [];
                    for (var i=0; i<markers.length; ++i) {
                        for (var j=0; j<reports.length; ++j) {
                            if (markers[i].id === reports[j].id) {
                                $scope.reports.markers.push(reports[j]);
                            }
                        }
                    }
                },
                function (errorPayload) {
                    $log.error('failure filtering reports', errorPayload);
                    $scope.reports.markers = {};
                }
            );
        }
    }

    $scope.$on('g-places-autocomplete:select', function(event, place) {
        filterCriteria = undefined;
        $scope.loading = $ionicLoading.show({
            content: 'Getting location...',
            showBackdrop: false
        });
        $scope.search.place = place.name + ", " + place.formatted_address;
        $scope.search.lat = place.geometry.location.lat();
        $scope.search.lng = place.geometry.location.lng();
        $scope.map.search = {
            id: 'search',
            coords: {
                latitude: $scope.search.lat,
                longitude: $scope.search.lng
            }
        };
        $scope.centerMap();
        $ionicLoading.hide();
    });

    $scope.overrideInfoWindowClick = function() {
        var set = google.maps.InfoWindow.prototype.set;
        google.maps.InfoWindow.prototype.set = function (key, val) {
            if (key === 'map') {
                if (!this.get('noSupress')) {
                    $scope.search.lat = this.position.lat();
                    $scope.search.lng = this.position.lng();
                    var place = this.content.childNodes[0].childNodes[1].innerText.trim();
                    $scope.centerSetByPlaceClick = true;
                    $scope.centerMap();
                    $scope.search.place = place;
                    $scope.$apply();
                    return;
                }
            }
            set.apply(this, arguments);
        };
    };

    $scope.submitSearch = function(keyEvent) {
        console.log(keyEvent);
        if (undefined === keyEvent) {
            $scope.search.place = filterCriteria;
            $scope.updateReportsInBounds();
        } else if (13 === keyEvent.which) {
            filterCriteria = $scope.search.place;
            $scope.updateReportsInBounds();
        }
    }

    $scope.updateBounds = function(map) {
        var center = map.getCenter();
        var centerCoords = {
            'Latitude': center.lat(),
            'Longitude': center.lng()
        };
        var positionCoords = $scope.map.position.coords;
        geocoder.geocode({'location': center}, function(results, status) {
            var topResult = results[0];
            if (undefined === filterCriteria) {
                if (!$scope.centerSetByPlaceClick) {
                    if (google.maps.GeocoderStatus.OK === status) {
                        if ('ROOFTOP' === topResult.geometry.location_type) {
                            $scope.search.place = topResult.formatted_address;
                        } else if (centerCoords === positionCoords) {
                            $scope.search.place = 'My position';
                        } else {
                            console.log('No exact address for this location: ', center);
                            $scope.search.place = center.toUrlValue();
                        }
                    } else {
                        console.error('geocode error: ', status);
                        $scope.search.place = center.toUrlValue();
                    }
                }
            }
            $scope.centerSetByPlaceClick = false;
            $scope.search.lat = centerCoords.Latitude;
            $scope.search.lng = centerCoords.Longitude;
            //TODO: handle scope updates to async model better than this
            $scope.$apply();
            $scope.updateReportsInBounds();
        });
    }

    $scope.updateReportsInBounds = function() {
        var lat = $scope.search.lat;
        var lng = $scope.search.lng;
        if (undefined === lat | undefined === lng) {
            return;
        }
        if (!$scope.Gmap) {
            uiGmapIsReady.promise(1).then(function(maps) {
                console.log('map is ready');
                $scope.Gmap = maps[0].map;
                $scope.updateReportsInBounds();
            });
        } else {
            console.log('update reports');
            var bounds = $scope.Gmap.getBounds();
            var ne = bounds.getNorthEast();
            var sw = bounds.getSouthWest();
            var distance = Math.sqrt(Math.pow(((69.1/1.61) * (ne.lat() - sw.lat())), 2) + Math.pow(((53/1.61) * (ne.lng() - sw.lng())), 2))/2;
            $scope.reports.markers = [];
            var promise = API.getReportsNearby($scope.search.lat, $scope.search.lng, distance);
            promise.then(
                function (payload) {
                    var reports = payload.data.reports;
                    console.log('fetched reports', reports);
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
                    $scope.filterReports();
                },
                function (errorPayload) {
                    $log.error('failure getting reports', errorPayload);
                }
            );
        }
    };
})

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

.controller('AddCtrl', function($scope, $rootScope, $ionicLoading, $log,
        $state, uiGmapGoogleMapApi, API) {
    var geocoder = new google.maps.Geocoder();
    // hacked because gmap's events don't include infowindow clicks
    $scope.centerSetByPlaceClick = false;
    $scope.form = {};
    $scope.mapReady = false;
    if (undefined !== $scope.search) {
        $scope.form.place = $scope.search.place;
    }
    $scope.map = {
        center: {
            latitude: 0,
            longitude: 0
        },
        events: {
            dragend: function(map) {
                $scope.updateBounds(map);
            },
            zoom_changed: function(map) {
                $scope.updateBounds(map);
            }
        },
        options: {
            disableDefaultUI: true
        },
        zoom: 15
    };

    uiGmapGoogleMapApi.then(function(uiMap) {
        $scope.mapReady = true;
        $scope.centerMap();
        $scope.overrideInfoWindowClick();
    });

    $scope.centerMap = function() {
        console.log('Centering');
        if (undefined === $scope.search || Object.keys($scope.search).length === 0) {
            $scope.centerOnMe();
        } else {
            $scope.map.center.latitude = $scope.search.lat;
            $scope.map.center.longitude = $scope.search.lng;
        }
    };

    $scope.centerOnMe = function() {
        console.log('Getting current location');
        $scope.loading = $ionicLoading.show({
            content: 'Getting current location...',
            showBackdrop: false
        });
        navigator.geolocation.getCurrentPosition(function(pos) {
            console.log('Got pos', pos);
            $scope.form.place = 'My location';
            $scope.search.lat = pos.coords.latitude;
            $scope.search.lng = pos.coords.longitude;
            $scope.map.position = {
                id: 'position',
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillOpacity: 1.0,
                    fillColor: '#4D90FE',
                    strokeColor: '#ffffff',
                    strokeWeight: 2.0,
                    scale: 7
                },
                coords: {
                    latitude: $scope.form.lat,
                    longitude: $scope.form.lng
                }
            };
            $scope.centerMap();
            $ionicLoading.hide();
        }, function(error) {
            alert('Unable to get location: ' + error.message);
        });
    };

    $scope.submitForm = function() {
        //TODO validation
        var reportJson = $scope.form;
        reportJson.lat = $scope.search.lat;
        reportJson.lng = $scope.search.lng;

        var promise = API.addReport(reportJson);
        promise.then(
            function (payload) {
                $state.go('report', {reportId: payload.data.report.insertId});
            },
            function (errorPayload) {
                $log.error('failure posting report', errorPayload);
            }
        );
    };

    $scope.$on('g-places-autocomplete:select', function(event, place) {
        $scope.loading = $ionicLoading.show({
            content: 'Getting location...',
            showBackdrop: false
        });
        $scope.form.place = place.formatted_address;
        $scope.search.lat = place.geometry.location.lat();
        $scope.search.lng = place.geometry.location.lng();
        $scope.centerMap();
        $ionicLoading.hide();
    });

    $scope.overrideInfoWindowClick = function() {
        var set = google.maps.InfoWindow.prototype.set;
        google.maps.InfoWindow.prototype.set = function (key, val) {
            if (key === 'map') {
                if (!this.get('noSupress')) {
                    $scope.search.lat = this.position.lat();
                    $scope.search.lng = this.position.lng();
                    var place = this.content.childNodes[0].childNodes[1].innerText.trim();
                    $scope.centerSetByPlaceClick = true;
                    $scope.centerMap();
                    $scope.form.place = place;
                    $scope.$apply();
                    return;
                }
            }
            set.apply(this, arguments);
        };
    };

    $scope.updateBounds = function(map) {
        if ($scope.centerSetByPlaceClick) {
            $scope.centerSetByPlaceClick = false;
        } else {
            var latlng = map.getCenter();
            geocoder.geocode({'location': latlng}, function(results, status) {
                var topResult = results[0];
                if (google.maps.GeocoderStatus.OK === status) {
                    if ('ROOFTOP' === topResult.geometry.location_type) {
                        $scope.form.place = topResult.formatted_address;
                    } else {
                        console.log('No exact address for this location: ', latlng);
                        $scope.form.place = latlng.toUrlValue();
                    }
                } else {
                    console.error('geocode error: ', status);
                    $scope.form.place = latlng.toUrlValue();
                }
                $scope.search.lat = latlng.lat;
                $scope.search.lng = latlng.lng;
                //TODO: handle scope updates to async model better than this
                $scope.$apply();
            });
        }
    }
})

.controller('ReportCtrl', function($rootScope, $scope, $log, uiGmapGoogleMapApi, $state, API) {
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
});
