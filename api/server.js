var http = require('http');
var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var mysql = require('mysql');
var cloudinary = require('cloudinary');
var dotenv = require('dotenv').config({path: '/var/www/demos/gleanhub/api/.env'});

// Configure database connection
function Connection() {
    this.pool = null;

    this.init = function() {
        this.pool = mysql.createPool({
            connectionLimit: 10,
            host     : process.env.HOSTNAME,
            user     : process.env.USERNAME,
            password : process.env.PASSWORD,
            database : process.env.DATABASE,
            debug    : false
        });
    };

    this.acquire = function(callback) {
        this.pool.getConnection(function(err, connection) {
            callback(err, connection);
        });
    };
}

// see: http://stackoverflow.com/questions/7067966/how-to-allow-cors-in-express-nodejs
function allowCrossDomain(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    }
    else {
        next();
    }
};

// Routes
var api = process.env.APIPATH;
var wuApi = process.env.WU_API;
var columns = ["datetime_occurred", "number", "text", "place", "lat", "lng"];
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_KEY,
    api_secret: process.env.CLOUD_SECRET
});

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
    connection.acquire(function(err, con) {
        con.query(query, function(err, rows) {
            con.release();
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
});

// Get report by id
router.get("/reports/:id", function(req, res) {
    var query = "SELECT * FROM ?? WHERE ??=?";
    var table = ["reports", "id", req.params.id];
    query = mysql.format(query, table);
    connection.acquire(function(err, con) {
        con.query(query, function(err, rows) {
            con.release();
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
});

// Get reports nearby
router.post("/reports/nearby", function(req, res) {
    var query = "SELECT *, ROUND(SQRT(POW(((69.1/1.61) * (? - ??)), 2) + POW(((53/1.61) * (? - ??)), 2)), 1) " +
        "AS distance FROM ?? HAVING distance < ? ORDER BY distance;";
    var table = [
        req.body.myLat.toString(), "lat",
        req.body.myLng.toString(), "lng",
        "reports", req.body.kmAway.toString()
    ];
    query = mysql.format(query, table);
    connection.acquire(function(err, con) {
        con.query(query, function(err, rows) {
            con.release();
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
});

// Get report by filter criteria
router.post("/reports/filter", function(req, res) {
    var query = "SELECT * FROM ??";
    var table = [
        "reports"
    ];
    var keys = Object.keys(req.body);
    for (var i = 0; i < keys.length; ++i) {
        query += i ? " AND" : " WHERE";
        key = keys[i];
        value = req.body[key];
        if ("*" === key) {
            for (var j = 0; j < columns.length; ++j) {
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
    connection.acquire(function(err, con) {
        con.query(query, function(err, rows) {
            con.release();
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
});

// Add report
router.post("/reports", function(req, res) {
    var report = req.body.reportJson;

    if (report.photo === undefined) {
        postReport();
    } else if (report.photo.length > 10) {
        cloudinary.uploader.upload(report.photo, function(result) {
            postReport(result.url);
        });
    } else {
        console.error('this doesn\'t look like a base64 image', report.photo);
        postReport();
    }

    function postReport(link) {
        var table = [];
        var query = "";
        if (link) {
            table = [
                "reports", "availability", "notes", "place", "lat", "lng",
                "smell", "contents", "cleanFood", "photo",
                report.availability, report.notes, report.place, report.lat, report.lng,
                report.smell, report.contents, report.cleanFood, link
            ];
            query = "INSERT INTO ??(??,??,??,??,??,??,??,??,??) VALUES (?,?,?,?,?,?,?,?,?)";
        } else {
            table = [
                "reports", "availability", "notes", "place", "lat", "lng",
                "smell", "contents", "cleanFood",
                report.availability, report.notes, report.place, report.lat, report.lng,
                report.smell, report.contents, report.cleanFood
            ];
            query = "INSERT INTO ??(??,??,??,??,??,??,??,??) VALUES (?,?,?,?,?,?,?,?)";
        }
        query = mysql.format(query, table);
        connection.acquire(function(err, con) {
            con.query(query, function(err, rows) {
                con.release();
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
    }
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
    connection.acquire(function(err, con) {
        con.query(query, function(err, rows) {
            con.release();
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
});

// Delete report by id
router.delete("/reports/:id", function(req, res) {
    var query = "DELETE from ?? WHERE ??=?";
    var table = ["reports", "id", req.params.id];
    query = mysql.format(query, table);
    connection.acquire(function(err, con) {
        con.query(query, function(err, rows) {
            con.release();
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
});

// Get temperature history -48 hours
router.post("/temp48", function(req, res) {
    var lat = req.body.lat;
    var lng = req.body.lng;
    var url = "http://api.wunderground.com/api/" + wuApi + "/history/q/" +
        lat + "," + lng + ".json";
    http.get(url, function(res0) {
        var body = '';
        res0.on('data', function(chunk) {
            body += chunk;
        });
        res0.on('end', function() {
            var fbResponse = JSON.parse(body);
            var hours = fbResponse.history.observations;
            var tempData = [];
            for (var i = 0; i < hours.length; ++i) {
                tempData.push(hours[i].tempi);
            }
            var date = fbResponse.history.date;
            var urlDate = date.year + date.mon + (Number(date.mday) - 1);
            var latestHour = hours.length - 1;
            var url = "http://api.wunderground.com/api/" + wuApi +
                "/history_" + urlDate + "/q/" + lat + "," + lng + ".json";

            http.get(url, function(res1) {
                var body = '';
                res1.on('data', function(chunk) {
                    body += chunk;
                });
                res1.on('end', function() {
                    var fbResponse = JSON.parse(body);
                    var hours = fbResponse.history.observations;
                    for (var i = hours.length - 1; i >= 0; --i) {
                        tempData.unshift(hours[i].tempi);
                    }
                    var date = fbResponse.history.date;
                    var urlDate = date.year + date.mon + (Number(date.mday) - 1);
                    var url = "http://api.wunderground.com/api/" + wuApi +
                        "/history_" + urlDate + "/q/" + lat + "," + lng + ".json";

                    http.get(url, function(res2) {
                        var body = '';
                        res2.on('data', function(chunk) {
                            body += chunk;
                        });
                        res2.on('end', function() {
                            var fbResponse = JSON.parse(body);
                            var hours = fbResponse.history.observations;
                            for (var i = hours.length - 1; i > latestHour; --i) {
                                tempData.unshift(hours[i].tempi);
                            }
                            res.json({
                                "tempData": {
                                    time: latestHour,
                                    temps: tempData
                                }
                            });
                        });
                    }).on('error', function(err) {
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
            }).on('error', function(err) {
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
    }).on('error', function(err) {
        res.status(500).json({
            "error": err
        });
    });
});

// Start server
var connection = new Connection();
var app = express();
app.use(bodyParser.urlencoded({
    limit: '10mb',
    extended: true
}));
app.use(bodyParser.json({
    limit: '10mb'
}));
app.use(allowCrossDomain);
app.use(process.env.APIPATH, router);
connection.init();
var server = app.listen(process.env.PORT, function() {
    console.log('Gleanhub API listening at port ' + server.address().port);
});
