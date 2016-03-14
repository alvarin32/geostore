var types = {};

var getType = function (typeId) {
    var type = types[typeId];
    if (!type) throw 'there is no type registered for ' + typeId;
    return type;
};

var defineType = function (type) {
    types[type.id] = type;
};

var primitive = function (name) {
    return {type: name};
};

exports.defineType = defineType;
exports.getType = getType;
exports.getTypes = function () {
    var result = [];
    for (var id in types) {
        result.push(types[id]);
    }
    return result;
};

exports.fuzzy = {
    type: 'string',
    analyzer: 'fuzzy'
};
exports.geoShape = primitive('geo_shape');
exports.geoPoint = primitive('geo_point');
exports.string = primitive('string');
exports.integer = primitive('integer');
exports.long = primitive('long');
exports.float = primitive('float');
exports.double = primitive('double');
exports.bool = primitive('bool');
exports.reference = {
    type: 'string',
    index: 'not_analyzed'
};
exports.nested = function (properties, disabled) {
    properties = properties || {};
    var result = {
        type: 'nested',
        properties: properties
    };
    if (disabled) result.enabled = false;
    return result;
};
exports.notAnalyzed = function (type) {
    var theCopy = copy(type);
    theCopy.index = 'not_analyzed';
    return theCopy;
};
exports.notIndexed = function (type) {
    var theCopy = copy(type);
    theCopy.index = 'no';
    return theCopy;
};

exports.write = function (atom) {
    return copy(atom, {id: true, type: true});
};
exports.read = function (body) {
    return copy(body);
};
exports.inherit = function (schema, extension) {
    var result = copy(schema);
    for (var key in extension) {
        result[key] = extension[key];
    }
    return result;
};

exports.toWire = function (atom) {
    var body = atom.type.write(atom);
    body.typeId = atom.type.id;
    body.id = atom.id;
    return body;
};

exports.fromWire = function (body, typeId) {
    var type = getType(typeId || body.typeId);
    delete body.typeId;
    var atom = type.read(body);
    atom.id = body.id;
    atom.type = type;
    return atom;
};

var copy = function (object, ignore) {
    var theCopy = {};
    for (var key in object) {
        if (ignore && ignore[key]) continue;
        theCopy[key] = object[key];
    }
    return theCopy;
};


exports.config = {

    index: {
        analysis: {
            analyzer: {
                default: {
                    tokenizer: "standard",
                    char_filter: ["umlaute"],
                    filter: ["lowercase", "asciifolding"]
                },
                fuzzy: {
                    type: "custom",
                    tokenizer: "standard",
                    char_filter: ["umlaute"],
                    filter: ["lowercase", "asciifolding", "fuzzy"]
                }
            },
            filter: {
                fuzzy: {
                    type: "ngram",
                    min_gram: 2,
                    max_gram: 2
                }
            },
            char_filter: {
                umlaute: {
                    type: "mapping",
                    mappings: ["ä=>ae", "ö=>oe", "ü=>ue", "ß=>ss", "Ä=>AE", "Ö=>OE", "Ü=>UE"]
                }
            }
        }
    }
};