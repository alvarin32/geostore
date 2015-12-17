var EARTH_RADIUS = 6378137; //meters
var RADIANS_PER_DEGREE = Math.PI / 180;
var CIRCUMFERENCE_AT_EQUATOR = 2 * Math.PI * EARTH_RADIUS;

var mercator = {
    transformPoint: function (point) {
        var latitude = point.getY();
        var longitude = point.getX();
        var sinLatitude = Math.sin(latitude * RADIANS_PER_DEGREE);
        var sinLatTemp = (1 + sinLatitude) / (1 - sinLatitude);

        var x = ((longitude + 180) / 360);
        var y = (0.5 - (Math.log(sinLatTemp) / (4 * Math.PI)));

        point.set(x, y);
    },
    transformDistance: function (distance, location) {
        return distance / 360; //TODO: respect location!
    }
};

var inverseMercator = {
    transformPoint: function (point) {
        var x = point.getX() - 0.5;
        var y = 0.5 - point.getY();

        var latitude = (90 - 360 * Math.atan(Math.exp(-y * 2 * Math.PI)) / Math.PI);
        var longitude = 360 * x;

        point.set(longitude, latitude);
    },
    transformDistance: function (distance, location) {
        return distance * 360; //TODO: respect location
    }
};

var meterToRadians = function (meters, latitude) {
    return meters * (360 / (Math.cos(latitude * Math.PI / 180) * CIRCUMFERENCE_AT_EQUATOR));
};

var radiansToMeters = function (radians, latitude) {
    return radians * ((Math.cos(latitude * Math.PI / 180) * CIRCUMFERENCE_AT_EQUATOR) / 360);
};

//meters per pixel
var getGroundResolution = function (latitude, mapSize) {
    return (Math.cos(latitude * Math.PI / 180) * CIRCUMFERENCE_AT_EQUATOR) / mapSize;
};

var mercatorMetersPerPixel = function (relativeY, mapSize) {
    var ratio = (relativeY < 0.5) ? (relativeY / 0.5) : (1 - relativeY) / 0.5;
    var earthCircumferenceAtY = (ratio * CIRCUMFERENCE_AT_EQUATOR);
    return earthCircumferenceAtY / mapSize;
};

module.exports = {
    mercator: mercator,
    inverseMercator: inverseMercator,
    meterToRadians: meterToRadians,
    radiansToMeters: radiansToMeters,
    metersPerPixel: mercatorMetersPerPixel,
    groundResolution: getGroundResolution
};