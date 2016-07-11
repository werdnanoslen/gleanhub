angular.module('controllers')

.controller('MapCtrl', function($scope, $rootScope, $ionicLoading, $state, $log,
        uiGmapGoogleMapApi, uiGmapIsReady, API) {
    var geocoder = new google.maps.Geocoder();
    var filterCriteria;
    $scope.Gmap;
    $scope.search = {};
    $scope.explicitSearch = false;
    $scope.reports = {
        'events': {
            click: function(gMarker, eventName, model) {
                $state.go('report', {reportId: model.id});
            }
        },
        'markers': [],
        'options': {
            'icon': {
                url: 'img/location.png',
                scaledSize: new google.maps.Size(50, 50) // scaled size
            }
        }
    };
    $scope.suggestions = {
        'events': {
            click: function(gMarker, eventName, model) {
                $scope.search.lat = model.latitude;
                $scope.search.lng = model.longitude;
                $scope.search.place = model.title;
                $scope.centerMap();
                $scope.$apply();
            }
        },
        'markers': [],
        'options': {
            'icon': {
                url: 'img/location-outline.png',
                scaledSize: new google.maps.Size(50, 50) // scaled size
            }
        }
    };
    $scope.map = {
        center: {
            latitude: 0,
            longitude: 0
        },
        control: {},
        events: {
            center_changed: function(map) {
                var bounds = map.getBounds();
                $scope.map.searchbox.options.bounds = bounds;
                $scope.updateBounds(map);
            },
            zoom_changed: function(map) {
                var bounds = map.getBounds();
                $scope.map.searchbox.options.bounds = bounds;
                $scope.updateBounds(map);
            }
        },
        options: {
            disableDefaultUI: true,
            clickableIcons: false
        },
        searchbox: {
            events: {
                places_changed: function (searchBox) {
                    filterCriteria = undefined;
                    $scope.explicitSearch = true;
                    $scope.loading = $ionicLoading.show({
                        content: 'Getting location...',
                        showBackdrop: false
                    });
                    var places = searchBox.getPlaces();
                    var bounds = new google.maps.LatLngBounds();
                    for (var i=0; i<places.length; ++i){
                        var place = places[i];
                        var marker = {
                            id: place.id,
                            latitude: place.geometry.location.lat(),
                            longitude: place.geometry.location.lng(),
                            title: place.name
                        };
                        var latlng = new google.maps.LatLng(marker.latitude, marker.longitude);
                        bounds.extend(latlng);
                        $scope.suggestions.markers.push(marker);
                    }
                    $scope.Gmap.fitBounds(bounds);
                    $ionicLoading.hide();
                }
            },
            options: {
                bounds: {}
            },
            parentdiv: "searchBarBox",
            template:'templates/searchbox.html'
        },
        zoom: 15
    };

    uiGmapGoogleMapApi.then(function(uiMap) {
        $scope.centerMap();
    });

    $scope.centerOnMe = function() {
        console.log('Getting current location');
        $scope.loading = $ionicLoading.show({
            content: 'Getting current location...',
            showBackdrop: false
        });
        navigator.geolocation.getCurrentPosition(function(pos) {
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
        }
    };

    $scope.filterReports = function() {
        if (undefined !== filterCriteria) {
            console.log('filtering by \'' + filterCriteria + '\'');
            var promise = API.getReports({"*": filterCriteria});
            promise.then(
                function (payload) {
                    if (204 === payload.status) {
                        console.log("no reports with that criteria");
                    } else {
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
                    }
                },
                function (errorPayload) {
                    $log.error('failure filtering reports', errorPayload);
                    $scope.reports.markers = {};
                }
            );
        }
    }

    $scope.clearSearch = function() {
        $scope.explicitSearch = false;
        $scope.search.place = "";
        $scope.suggestions.markers = [];
    }

    $scope.submitSearch = function(keyEvent) {
        if (undefined === keyEvent) {
            $scope.search.place = filterCriteria;
        } else if (13 === keyEvent.which) {
            filterCriteria = $scope.search.place;
        }
    }

    $scope.updateBounds = function(map) {
        $scope.Gmap = map;
        $scope.search.lat = map.center.lat();
        $scope.search.lng = map.center.lng();
        var latlng = new google.maps.LatLng($scope.search.lat, $scope.search.lng);
        var bounds = $scope.Gmap.getBounds();
        var ne = bounds.getNorthEast();
        var sw = bounds.getSouthWest();
        $scope.map.searchbox.options.bounds = new google.maps.LatLngBounds(sw, ne);

        var distance = Math.sqrt(Math.pow(((69.1/1.61) * (ne.lat() - sw.lat())), 2) + Math.pow(((53/1.61) * (ne.lng() - sw.lng())), 2))/2;
        $scope.reports.markers = [];
        var promise = API.getReportsNearby(latlng.lat(), latlng.lng(), distance);
        promise.then(
            function (payload) {
                if (204 === payload.status) {
                    console.log("no reports in bounds");
                } else {
                    var reports = payload.data.reports;
                    console.log('fetched reports', payload);
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
                }
            },
            function (errorPayload) {
                $log.error('failure getting reports', errorPayload);
            }
        );
    };
})
