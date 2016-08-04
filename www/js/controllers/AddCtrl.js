angular.module('controllers')

.controller('AddCtrl', function($scope, $rootScope, $ionicLoading, $log,
        $state, $timeout, $ionicHistory, uiGmapGoogleMapApi, uiGmapIsReady, API) {
    $scope.noGoingBack = (null === $ionicHistory.backView()) ? true : false;
    var geocoder = new google.maps.Geocoder();
    // hacked because gmap's events don't include infowindow clicks
    $scope.Gmap;
    $scope.isDragging = false;
    $scope.form = {};
    $scope.keyboardSpace = "";
    $scope.photoPreview = false;
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
                $scope.updateBounds(map);
            },
            dragstart: function() {
                $scope.isDragging = true;
            },
            zoom_changed: function(map) {
                $scope.updateBounds(map);
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
            disableDefaultUI: true,
            clickableIcons: false
        },
        zoom: 15
    };

    var autocomplete = new google.maps.places.Autocomplete(document.querySelector('#search'));
    autocomplete.addListener('place_changed', function() {
        $scope.blurWhere();
        $scope.loading = $ionicLoading.show({
            content: 'Getting location...',
            showBackdrop: false
        });
        var place = autocomplete.getPlace();
        $scope.form.place = place.formatted_address;
        $scope.search.lat = place.geometry.location.lat();
        $scope.search.lng = place.geometry.location.lng();
        $scope.centerMap();
        $ionicLoading.hide();
    });

    $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        $scope.noGoingBack = (null === $ionicHistory.backView()) ? true : false;
        $scope.form = {};
        $scope.removePhoto();
    });

    uiGmapGoogleMapApi.then(function(uiMap) {
        $scope.mapReady = true;
        $scope.centerMap();
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
            $scope.setCenter(pos.coords.latitude, pos.coords.longitude);
            $ionicLoading.hide();
        }, function(error) {
            var promise = API.ipGeolocate();
            promise.then(
                function (payload) {
                    var latlng = payload.data.loc.split(',');
                    $scope.setCenter(latlng[0], latlng[1]);
                    $ionicLoading.hide();
                },
                function (errorPayload) {
                    $log.error('Unable to get location', errorPayload);
                    $ionicLoading.hide();
                }
            );
            $log.error('Unable to get location', error.message);
        });
    };

    $scope.setCenter = function(lat, lng) {
        console.log('got location', {lat, lng});
        $scope.search.lat = lat;
        $scope.search.lng = lng;
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
                longitude:$scope.search.lng
            }
        };
        $scope.centerMap();
    };

    $scope.blurWhere = function(event) {
        $scope.keyboardSpace = "";
    };

    $scope.focusWhere = function(event) {
        var rect = event.target.getBoundingClientRect();
        $scope.keyboardSpace = 50-1*rect.top+"px";
    };


    $scope.previewPhoto = function() {
        var file = document.querySelector('#photo').files[0];
        var canvas = document.getElementById('photoPreview');
        var ctx = canvas.getContext('2d');
        var reader = new FileReader();
        reader.onload = function(event) {
            var img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
            }
            $scope.form.photo = img.src;
            $scope.$apply(function () {
                $scope.photoPreview = true;
            });
        }
        reader.readAsDataURL(file);
    }

    $scope.removePhoto = function() {
        $scope.form.photo = undefined;
        $scope.photoPreview = false;
    }

    $scope.submitForm = function() {
        //TODO validation
        var reportJson = $scope.form;
        reportJson.active = true;
        reportJson.lat = $scope.search.lat;
        reportJson.lng = $scope.search.lng;
        var promise = API.addReport(reportJson);
        promise.then(
            function (payload) {
                $scope.removePhoto();
                $state.go('report', {reportId: payload.data.report.insertId});
            },
            function (errorPayload) {
                $log.error('failure posting report', errorPayload);
            }
        );
    };

    $scope.updateBounds = function(map) {
        $scope.Gmap = map;
        $scope.search.lat = map.center.lat();
        $scope.search.lng = map.center.lng();
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
            $scope.map.center.latitude = latlng.lat();
            $scope.map.center.longitude = latlng.lng();
            $scope.search.lat = latlng.lat();
            $scope.search.lng = latlng.lng();
            //TODO: handle scope updates to async model better than this
            $scope.$apply();
        });
    }
})
