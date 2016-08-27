angular.module('services', [])

.factory('API', function ($q, $http) {
    var deferred = $q.defer();
    var api = 'http://45.55.80.26:8001/demos/gleanhub/api/';

    return {
        ipGeolocate: function() {
            return $http.get('http://ipinfo.io');
        },
        getReports: function () {
            return $http.get(api + 'reports');
        },
        getReport: function (id) {
            return $http.get(api + 'reports/' + id);
        },
        getReports: function(filters) {
            return $http({
                url: api + 'reports/filter',
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                data: filters
            });
        },
        getReportsNearby: function(myLat, myLng, kmAway) {
            return $http({
                url: api + 'reports/nearby',
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                data: {'myLat': myLat, 'myLng': myLng, 'kmAway': kmAway}
            });
        },
        getTemp48: function(lat, lng) {
            return $http({
                url: api + 'temp48',
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                data: {'lat': lat, 'lng': lng}
            });
        },
        addReport: function (reportJson) {
            return $http({
                url: api + 'reports',
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                data: {'reportJson': reportJson}
            });
        },
        updateReport: function (id, reportJson) {
            return $http({
                url: api + 'reports/' + id,
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                data: {'reportJson': reportJson}
            });
        },
        deleteReport: function (id) {
            return $http({
                url: api + 'reports/' + id,
                method: 'DELETE'
            });
        }
    };
});
