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
        if (!definition) return query.all();
        return query;
    };

    query.define = function (_definition) {
        definition = {query: _definition};
        return query;
    };

    query.filtered = function (filter) {
        return query.define({
            filtered: {filter: filter}
        });
    };

    query.all = function () {
        return query.define({match_all: {}});
    };

    query.compile = function (index) {
        var body = {};
        if (index) body.index = index;
        if (type) body.type = type.id;
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
    },
    filtered: function (filter) {
        return (newQuery()).filtered(filter);
    },
    all: function () {
        return (newQuery()).all();
    }
};