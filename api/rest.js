var http = require('http');
var mysql = require("mysql");
var secrets = require("./secrets.js");
var api = secrets.APIPATH;
var wuApi = secrets.WU_API;
var columns = ["datetime_occurred", "number", "text", "place", "lat", "lng"];

function REST_ROUTER(router, connection) {
    var self = this;
    self.handleRoutes(router, connection);
}

REST_ROUTER.prototype.handleRoutes = function(router, connection) {
    // Get API info
    router.get("/", function(req, res) {
        res.json({
            "Message": "This is the Gleanhub API"
        });
    });

    // Get all reports
    router.get("/reports", function(req, res) {
        var query = "SELECT * FROM ??";
        var table = ["reports"];
        query = mysql.format(query, table);
        connection.query(query, function(err, rows) {
            if (err) {
               res.status(500).json({
                   "error": err
               });
           } else {
                res.json({
                    "reports": rows
                });
            }
        });
    });

    // Get report by id
    router.get("/reports/:id", function(req, res) {
        var query = "SELECT * FROM ?? WHERE ??=?";
        var table = ["reports", "id", req.params.id];
        query = mysql.format(query, table);
        connection.query(query, function(err, rows) {
            if (err) {
                res.status(500).json({
                    "error": err
                });
            } else {
                res.json({
                    "report": rows
                });
            }
        });
    });

    // Get reports nearby
    router.post("/reports/nearby", function(req, res) {
        var query = "SELECT *, ROUND(SQRT(POW(((69.1/1.61) * (? - ??)), 2) + POW(((53/1.61) * (? - ??)), 2)), 1) "
                + "AS distance FROM ?? HAVING distance < ? ORDER BY distance;";
        var table = [
            req.body.myLat.toString(), "lat",
            req.body.myLng.toString(), "lng",
            "reports", req.body.kmAway.toString()
        ];
        query = mysql.format(query, table);
        connection.query(query, function(err, rows) {
            if (err) {
                res.status(500).json({
                    "error": err
                });
            } else if (rows.length < 1) {
                res.sendStatus(204);
            } else {
                res.json({
                    "reports": rows
                });
            }
        });
    });

    // Get report by filter criteria
    router.post("/reports/filter", function(req, res) {
        var query = "SELECT * FROM ??";
        var table = [
            "reports"
        ];
        var keys = Object.keys(req.body);
        for (var i=0; i<keys.length; ++i) {
            query += i ? " AND" : " WHERE";
            key = keys[i];
            value = req.body[key];
            if ("*" === key) {
                for (var j=0; j<columns.length; ++j) {
                    query += j ? " OR" : " (";
                    query += " ?? LIKE ?";
                    valueLike = "%" + value + "%";
                    table.push(columns[j], valueLike);
                }
                query += " ) ";
            } else {
                query += " ?? LIKE ?";
                valueLike = "%" + value + "%";
                table.push(key, valueLike);
            }
        }
        query = mysql.format(query, table);
        connection.query(query, function(err, rows) {
            if (err) {
                res.status(500).json({
                    "error": err
                });
            } else if (rows.length < 1) {
                res.sendStatus(204);
            } else {
                res.json({
                    "reports": rows
                });
            }
        });
    });

    // Add report
    router.post("/reports", function(req, res) {
        var query = "INSERT INTO ??(??,??,??,??,??,??,??,??) VALUES (?,?,?,?,?,?,?,?)";
        var report = req.body.reportJson;
        var table = [
            "reports", "availability", "notes", "place", "lat", "lng",
            "smell", "contents", "cleanFood",
            report.availability, report.notes, report.place, report.lat, report.lng,
            report.smell, report.contents, report.cleanFood
        ];
        query = mysql.format(query, table);
        connection.query(query, function(err, rows) {
            if (err) {
                res.status(500).json({
                    "error": err
                });
            } else {
                res.json({
                    "report": rows
                });
            }
        });
    });

    // Update report
    router.put("/reports/:id", function(req, res) {
        var query = "UPDATE ?? SET ?? = ? WHERE ?? = ?";
        var report = req.body.reportJson;
        var table = ["reports",
            "active", report.active,
            "id", req.params.id
        ];
        query = mysql.format(query, table);
        connection.query(query, function(err, rows) {
            if (err) {
                res.status(500).json({
                    "error": err
                });
            } else {
                res.json({
                    "report": rows
                });
            }
        });
    });

    // Delete report by id
    router.delete("/reports/:id", function(req, res) {
        var query = "DELETE from ?? WHERE ??=?";
        var table = ["reports", "id", req.params.id];
        query = mysql.format(query, table);
        connection.query(query, function(err, rows) {
            if (err) {
                res.status(500).json({
                    "error": err
                });
            } else {
                res.json({
                    "report": rows
                });
            }
        });
    });

    // Get temperature history -48 hours
    router.post("/temp48", function(req, res) {
        var lat = req.body.lat;
        var lng = req.body.lng;
        var url = "http://api.wunderground.com/api/" + wuApi + "/history/q/"
            + lat + "," + lng + ".json";
        http.get(url, function(res0){
            var body = '';
            res0.on('data', function(chunk){
                body += chunk;
            });
            res0.on('end', function(){
                var fbResponse = JSON.parse(body);
                var hours = fbResponse.history.observations;
                var tempData = [];
                for (var i=0; i<hours.length; ++i) {
                    tempData.push(hours[i].tempi);
                }
                var date = fbResponse.history.date;
                var urlDate = date.year + date.mon + (Number(date.mday)-1);
                var latestHour = hours.length-1;
                var url = "http://api.wunderground.com/api/" + wuApi
                    + "/history_" + urlDate + "/q/" + lat + "," + lng + ".json";

                http.get(url, function(res1){
                    var body = '';
                    res1.on('data', function(chunk){
                        body += chunk;
                    });
                    res1.on('end', function(){
                        var fbResponse = JSON.parse(body);
                        var hours = fbResponse.history.observations;
                        for (var i=hours.length-1; i>=0; --i) {
                            tempData.unshift(hours[i].tempi);
                        }
                        var date = fbResponse.history.date;
                        var urlDate = date.year + date.mon + (Number(date.mday)-1);
                        var url = "http://api.wunderground.com/api/" + wuApi
                            + "/history_" + urlDate + "/q/" + lat + "," + lng + ".json";

                        http.get(url, function(res2){
                            var body = '';
                            res2.on('data', function(chunk){
                                body += chunk;
                            });
                            res2.on('end', function(){
                                var fbResponse = JSON.parse(body);
                                var hours = fbResponse.history.observations;
                                for (var i=hours.length-1; i>latestHour; --i) {
                                    tempData.unshift(hours[i].tempi);
                                }
                                res.json({
                                    "tempData": {
                                        time: latestHour,
                                        temps: tempData
                                    }
                                });
                            });
                        }).on('error', function(err){
                            res.json({
                                "tempData": {
                                    time: latestHour,
                                    temps: tempData
                                }
                            });
                            res2.status(500).json({
                                "error": err
                            });
                        });
                    });
                }).on('error', function(err){
                    res.json({
                        "tempData": {
                            time: latestHour,
                            temps: tempData
                        }
                    });
                    res1.status(500).json({
                        "error": err
                    });
                });
            });
        }).on('error', function(err){
            res.status(500).json({
                "error": err
            });
        });
    });
}

module.exports = REST_ROUTER;
