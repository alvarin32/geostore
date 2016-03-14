var EARTH_RADIUS = 6378137; //meters
var RADIANS_PER_DEGREE = Math.PI / 180;
var CIRCUMFERENCE_AT_EQUATOR = 2 * Math.PI * EARTH_RADIUS;

var mercator = function (point) {
    var latitude = point.getY();
    var longitude = point.getX();
    latitude = Math.min(89.5, Math.max(-89.5, latitude));
    var sinLatitude = Math.sin(latitude * RADIANS_PER_DEGREE);
    var sinLatTemp = (1 + sinLatitude) / (1 - sinLatitude);

    var x = ((longitude + 180) / 360);
    var y = (0.5 - (Math.log(sinLatTemp) / (4 * Math.PI)));

    point.set(x, y);
};


var inverseMercator = function (point) {
    var x = point.getX() - 0.5;
    var y = 0.5 - point.getY();

    var latitude = (90 - 360 * Math.atan(Math.exp(-y * 2 * Math.PI)) / Math.PI);
    var longitude = 360 * x;

    point.set(longitude, latitude);
};


var circumferenceAt = function (referenceDegree) {
    var referenceRadians = referenceDegree * RADIANS_PER_DEGREE;
    return Math.cos(referenceRadians) * CIRCUMFERENCE_AT_EQUATOR;
};

var metersToDegrees = function (meters, latitude) {
    var degreesPerMeter = (360 / circumferenceAt(latitude));
    return meters * degreesPerMeter;
};

var degreesToMeters = function (degrees, latitude) {
    var metersPerDegree = (circumferenceAt(latitude) / 360);
    return degrees * metersPerDegree;
};

var computeDistance = function (lat1, lon1, lat2, lon2) {
    var referenceLat = (lat1 + lat2) / 2;
    var referenceLon = (lon1 + lon2) / 2;
    var deltaLat = (circumferenceAt(referenceLon) / 360) * (lat1 - lat2);
    var deltaLon = (circumferenceAt(referenceLat) / 360) * (lon1 - lon2);
    return Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon);
};

module.exports = {
    mercator: mercator,
    inverseMercator: inverseMercator,
    metersToDegrees: metersToDegrees,
    degreesToMeters: degreesToMeters,
    computeDistance: computeDistance
};