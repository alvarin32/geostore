var newQuery = function () {

    var query = {};
    var definition;
    var type;
    var options;

    query.options = function ($options) {
        options = $options;
        return query;
    };

    query.type = function (_type) {
        type = _type;
        return query;
    };

    query.define = function (_definition) {
        definition = {query: _definition};
        return query;
    };

    query.filtered = function(filter){
        definition = {query:{filtered:{filter:filter}}};
        return query;
    }

    query.set = function (key, value) {
        definition[key] = value.toGeoJson ? value.toGeoJson() : value;
        return query;
    };

    query.compile = function (index) {
        var body = {};
        if (index) body.index = index;
        if (type) body.type = type.id();
        body.body = definition;
        for (var key in options) {
            body[key] = options[key];
        }
        return body;
    };

    return query;
};

module.exports = {
    define: function (definition) {
        return (newQuery()).define(definition);
    },
    type: function (type) {
        return (newQuery()).type(type);
    }
};