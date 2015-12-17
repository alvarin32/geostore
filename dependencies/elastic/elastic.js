var ElasticSearch = require('elasticsearch');
var Fs = require('fs');
var Schema = require('./schema');


/*

 interface type{

 id : string

 read(body : object) : object

 write(atom: object) : object

 describe() : object 
 }

 */


var INDEX_NAME = 'atoms';


exports.createClient = function (onDone) {

    var client = new ElasticSearch.Client();

    setupIndex(client, function (error) {
        if (error) return onDone(error);
        setupSchema(client, function (error) {
            if (error) return onDone(error);
            client = defineInterface(client);
            onDone(undefined, client);
        });
    });
};

var setupIndex = function (client, onDone) {
    client.indices.exists({index: INDEX_NAME}, function (error, exists) {
        if (error) return onDone(error);
        if (exists) return onDone();
        client.indices.create({
            index: INDEX_NAME,
            body: {settings: Schema.config}
        }, function (error) {
            if (error) return onDone(error);
            onDone();
        });
    });
};


var setupSchema = function (client, onDone) {

    var types = Schema.getTypes();
    var toDefine = types.length;
    var errorThrown = false;
    var _onDone = function (error) {
        if (error) {
            errorThrown = true;
            return onDone(error);
        }
        toDefine--;
        if (!toDefine && !errorThrown) return onDone();
    };

    types.forEach(function (type) {
        var body = {};
        body[type.id] = {properties: (type.schema || {})};

        client.indices.putMapping({
            index: INDEX_NAME,
            type: type.id,
            body: body
        }, _onDone);
    });

};


var defineInterface = function (client) {

    var _interface = {};
    var bulk = [];
    var bulkSize = 0;

    _interface.putBulk = function (atom) {
        var request = {_index: INDEX_NAME, _type: atom.type.id};
        if (atom.id) request._id = atom.id;
        bulk.push({index: request}, atom.type.write(atom));
        return ++bulkSize;
    };


    _interface.commitBulk = function (onDone) {
        if (!bulk.length && onDone) return process.nextTick(onDone);
        client.bulk({body: bulk}, function (error) {
            if (error) return onDone ? onDone(error) : console.error('error on commiting a bulk: ' + error);
            if (onDone) onDone();
        });
        bulk = [];
        bulkSize = 0;
    };

    _interface.put = function (atom, onDone) {
        var request = {
            index: INDEX_NAME,
            type: atom.type.id,
            body: atom.type.write(atom)
        };
        if (atom.id) request.id = atom.id;
        client.index(request, function (error, response) {
            if (error) return (onDone ? onDone(error) : console.error(error));
            atom.id = response._id;
            if (onDone) onDone();
        });
    };

    _interface.delete = function (typeId, atomId, onDone) {
        client.delete({
            index: INDEX_NAME,
            id: atomId,
            type: typeId
        }, onDone || console.error);
    };

    _interface.get = function (atomId, onDone) {
        client.get({
            index: INDEX_NAME,
            id: atomId,
            type: '_all',
            _source: true
        }, function (error, response) {
            if (error) return onDone(error);
            var type = Schema.getType(response._type);
            var atom = readAtom(response._source, atomId, type);
            onDone(undefined, atom);
        });
    };

    _interface.search = function (query, onDone, options) {
        query = query.compile(INDEX_NAME);
        options = options || {};
        query._source = true;
        for (var key in options) {
            query[key] = options[key];
        }
        client.search(query, function (error, response) {
            if (error) return onDone(error);
            var hits = parseHits(response);
            onDone(undefined, {total: response.hits.total, hits: hits});
        });
    };

    _interface.forEach = function (query, options) {

        options = options || {};

        var from = options.from || 0;
        var size = options.size || 1000;
        var onItem = (options['onItem'] || console.log);

        _interface.search(query, function (error, result) {
            if (error) return onError(error);
            var items = result.hits;
            for (var i = 0; i < items.length; i++) {
                try {
                    onItem(items[i]);
                } catch (error) {
                    return (options.onError || console.error)(error);
                }
            }
            options.from = from + size;
            if (options.from < result.total) {
                _interface.forEach(options);
            } else {
                if (options.onDone) options.onDone();
            }
        }, {from: from, size: size});
    };

    _interface.deleteByQuery = function (query, onDone) {
        query = query.compile(INDEX_NAME);
        query.scroll = '30s';
        query.search_type = 'scan';
        query.fields = ['_id'];
        var deletedDocuments = 0;
        client.search(query, function deleteHitsAndGoOn(error, response) {
            if (error) return onDone(error);
            deleteHits(response.hits.hits, function (error) {
                if (error) return onDone(error);
                deletedDocuments += response.hits.hits.length;
                if (deletedDocuments >= response.hits.total) return onDone();
                client.scroll({
                    scrollId: response['_scroll_id'],
                    scroll: '30s'
                }, deleteHitsAndGoOn);
            });
        });
    };

    var deleteHits = function (hits, onDone) {
        if (!hits.length) return onDone();
        var bulk = [];
        hits.forEach(function (hit) {
            bulk.push({
                delete: {_index: INDEX_NAME, _type: hit._type, _id: hit._id}
            });
        });
        client.bulk({body: bulk}, onDone);
    };

    _interface.count = function (query, onDone) {
        query = query.compile(INDEX_NAME);
        client.count(query, function (error, response) {
            if (error) return onDone(error);
            onDone(undefined, response.count);
        });
    };

    _interface.refresh = function (onDone) {
        client.indices.refresh({
            index: INDEX_NAME
        }, onDone || console.error);
    };

    _interface.close = function () {
        client.close();
    };

    return _interface;
};


var parseHits = function (response) {
    var hits = [];
    if (response.hits) {
        response.hits.hits.forEach(function (hit) {
            var type = Schema.getType(hit._type);
            var atom = readAtom(hit._source, hit._id, type);
            hits.push(atom);
        });
    }
    return hits;
};

var readAtom = function (body, id, type) {
    var atom = type.read(body);
    atom.id = id;
    atom.type = type;
    return atom;
};
