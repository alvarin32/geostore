var ElasticSearch = require('elasticsearch');
var Fs = require('fs');
var Schema = require('./schema');


exports.createClient = function (indexName) {

    var dropIndex = function (onDone) {
        client.indices.delete({index: indexName}, onDone);
    };

    var createIndex = function (onDone) {
        client.indices.exists({index: indexName}, function (error, exists) {
            if (error) return onDone(error);
            if (exists) return onDone();
            client.indices.create({
                index: indexName,
                body: {settings: Schema.config}
            }, onDone);
        });
    };

    var setupSchema = function (onDone) {

        var types = Schema.getTypes();
        var toDefine = types.length;
        var errorThrown = false;
        var _onDone = onDone;

        onDone = function (error) {
            errorThrown = errorThrown || error;
            toDefine--;
            if (!toDefine) return _onDone(errorThrown);
        };

        types.forEach(function (type) {
            var body = {};
            body[type.id] = {properties: (type.schema || {})};

            client.indices.putMapping({
                index: indexName,
                type: type.id,
                body: body
            }, onDone);
        });
    };

    var setup = function (onDone) {
        createIndex(function (error) {
            if (error) return onDone(error);
            setupSchema(onDone);
        });
    };

    var reset = function (onDone) {
        dropIndex(function (error) {
            if (error) return onDone(error);
            setup(onDone);
        });
    };

    var defineInterface = function () {

        var _ = {};

        _.drop = dropIndex;
        _.setup = setup;
        _.reset = reset;

        var bulk = [];
        var bulkSize = 0;

        _.putBulk = function (atom) {
            var request = {_index: indexName, _type: atom.type.id};
            if (atom.id) request._id = atom.id;
            bulk.push({index: request}, atom.type.write(atom));
            return ++bulkSize;
        };

        _.commitBulk = function (onDone) {
            if (!bulk.length && onDone) return process.nextTick(onDone);
            client.bulk({body: bulk}, function (error, response) {
                if (error) return onDone ? onDone(error) : console.error('error on commiting a bulk: ' + error);
                if (onDone) onDone(undefined, response);
            });
            bulk = [];
            bulkSize = 0;
        };

        _.put = function (atom, onDone) {
            var request = {
                index: indexName,
                type: atom.type.id,
                body: atom.type.write(atom)
            };
            if (atom.id) request.id = atom.id;
            client.index(request, function (error, response) {
                if (error) return (onDone ? onDone(error) : console.error(error));
                atom.id = response._id;
                if (onDone) onDone(undefined, atom);
            });
        };

        _.delete = function (typeId, atomId, onDone) {
            client.delete({
                index: indexName,
                id: atomId,
                type: typeId
            }, onDone || console.error.bind(console));
        };

        _.mget = function (atomIds, onDone) {
            var docs = atomIds.map(function (id) {
                return {_index: indexName, _id: id};
            });
            client.mget({
                body: {docs: docs}
            }, function (error, response) {
                if (error) return onDone(error);
                for (var i = 0; i < response.docs.length; i++) {
                    if (!response.docs[i].found) return onDone('could not find atom with id ' + atomIds[i]);
                }
                var atoms = parseHits(response.docs);
                onDone(undefined, atoms);
            });
        };

        _.get = function (atomId, onDone) {
            client.get({
                index: indexName,
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

        _.search = function (query, onDone, options) {
            query = query.compile(indexName);
            options = options || {};
            query._source = true;
            for (var key in options) {
                query[key] = options[key];
            }
            client.search(query, function (error, response) {
                if (error) return onDone(error);
                var hits = parseHits(response.hits.hits);
                onDone(undefined, {total: response.hits.total, hits: hits});
            });
        };

        _.forEach = function (query, options) {
            options = options || {};
            var onItem = options.onItem;

            var onDone = function (error) {
                if (!scrollId) return options.onDone(error);
                client.clearScroll({scrollId: scrollId}, function ($error) {
                    options.onDone(error || $error);
                });
            };

            var scrollId;

            query = query.compile(indexName);
            query.scroll = '30s';
            query.size = options.size || 1000;
            client.search(query, function goOn(error, response) {
                if (error) return onDone(error);
                scrollId = response['_scroll_id']
                var hits = parseHits(response.hits.hits);
                hits.forEach(onItem);
                if (hits.length < query.size) return onDone();
                client.scroll({
                    scrollId: scrollId,
                    scroll: '30s'
                }, goOn);
            });
        };

        _.deleteByQuery = function (query, onDone) {
            query = query.compile(indexName);
            query.scroll = '30s';
            query.fields = ['_id'];
            query.size = 100000;

            var scrollId;
            var _onDone = onDone;
            onDone = function (error) {
                if (!scrollId) return _onDone(error);
                client.clearScroll({scrollId: scrollId}, function ($error) {
                    _onDone(error || $error);
                });
            };

            var deletedDocuments = 0;
            client.search(query, function deleteHitsAndGoOn(error, response) {
                if (error) return onDone(error);
                scrollId = response['_scroll_id'];
                deleteHits(response.hits.hits, function (error) {
                    if (error) return onDone(error);
                    deletedDocuments += response.hits.hits.length;
                    if (deletedDocuments >= response.hits.total) return onDone();
                    client.scroll({
                        scrollId: scrollId,
                        scroll: '30s'
                    }, deleteHitsAndGoOn);
                });
            });
        };

        var deleteHits = function (hits, onDone) {
            if (!hits.length) return onDone();
            var bulk = hits.map(function (hit) {
                return {delete: {_index: indexName, _type: hit._type, _id: hit._id}};
            });
            client.bulk({body: bulk}, onDone);
        };

        _.count = function (query, onDone) {
            query = query.compile(indexName);
            client.count(query, function (error, response) {
                if (error) return onDone(error);
                onDone(undefined, response.count);
            });
        };

        _.refresh = function (onDone) {
            client.indices.refresh({
                index: indexName
            }, onDone || console.error.bind(console));
        };

        _.close = function () {
            client.close();
        };

        return _;
    };


    var parseHits = function (hits) {
        if (!hits || !hits.length) return [];
        return hits.map(function (hit) {
            var type = Schema.getType(hit._type);
            return readAtom(hit._source, hit._id, type);
        });
    };

    var readAtom = function (body, id, type) {
        var atom = type.read(body);
        atom.id = id;
        atom.type = type;
        return atom;
    };


    var client = new ElasticSearch.Client();
    return defineInterface();

};