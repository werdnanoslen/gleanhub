angular.module('controllers')

.controller('AddCtrl', function($scope, $rootScope, $ionicLoading, $log,
        $state, $timeout, uiGmapGoogleMapApi, uiGmapIsReady, API) {
    var geocoder = new google.maps.Geocoder();
    // hacked because gmap's events don't include infowindow clicks
    $scope.centerSetByPlaceClick = false;
    $scope.Gmap;
    $scope.isDragging = false;
    $scope.form = {};
    $scope.keyboardSpace = "";
    $scope.mapReady = false;
    if (undefined !== $scope.search) {
        $scope.form.place = $scope.search.place;
    }
    $scope.map = {
        center: {
            latitude: 0,
            longitude: 0
        },
        control: {},
        events: {
            center_changed: function(map) {
                $scope.isDragging = false;
                $scope.search.lat = map.center.lat();
                $scope.search.lng = map.center.lng();
                $scope.updateBounds();
            },
            dragstart: function() {
                $scope.isDragging = true;
            },
            zoom_changed: function(map) {
                $scope.search.lat = map.center.lat();
                $scope.search.lng = map.center.lng();
                $scope.updateBounds();
            }
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
            $scope.updateBounds();
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
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                }
            };
            $scope.centerMap();
            $ionicLoading.hide();
        }, function(error) {
            alert('Unable to get location: ' + error.message);
        });
    };

    $scope.blurWhere = function(event) {
        $scope.keyboardSpace = "";
    };

    $scope.focusWhere = function(event) {
        var rect = event.target.getBoundingClientRect();
        $scope.keyboardSpace = 50-1*rect.top+"px";
    };

    $scope.submitForm = function() {
        //TODO validation
        var reportJson = $scope.form;
        reportJson.active = true;
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
        $scope.blurWhere();
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

    $scope.updateBounds = function() {
        if ($scope.centerSetByPlaceClick) {
            $scope.centerSetByPlaceClick = false;
        } else if (!$scope.Gmap) {
            $timeout(function() {
                $scope.Gmap = $scope.map.control.getGMap();
                $scope.updateBounds();
            });
        } else {
            var latlng = new google.maps.LatLng($scope.search.lat, $scope.search.lng);
            $scope.map.search = {
                id: 'search',
                coords: {
                    latitude: latlng.lat(),
                    longitude: latlng.lng()
                }
            };
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
                $scope.search.lat = latlng.lat();
                $scope.search.lng = latlng.lng();
                //TODO: handle scope updates to async model better than this
                $scope.$apply();
            });
        }
    }
})
