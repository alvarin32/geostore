var ElasticSearch = require('elasticsearch');
var Fs = require('fs');

var INDEX_NAME = 'atoms';

var types = {};

exports.registerType = function(type){
    types[type.id] = type;
};

var getType = function(typeId){
    var type = types[typeId];
    if(!type) throw 'there is not type registered for ' + typeId;
    return type;
};

exports.createClient = function(options, onDone){
    options = options || {};
    var log = options.log || {
        error: function(error){console.error(error);},
        info: function(info){console.log(info);},
        warning: function(warning){console.warning(warning);}
    };


    var client = new ElasticSearch.Client();

    setupIndex(client, function(error){
        if(error) return onDone(error);
        setupSchema(client, function(error){
            if(error) return onDone(error);
            client = defineInterface(client);
            onDone(undefined, client);
        });
    });


};

var setupIndex = function(client, onDone){
	client.indices.exists({index: INDEX_NAME}, function (error, exists) {
        if (error) return onDone(error);
        if (exists) return onDone();
        var settings = JSON.parse(Fs.readFileSync('assets/es_settings.json'));
        client.indices.create({
            index: INDEX_NAME,
            body: {settings: settings}
        }, function (error) {
            if (error) return onDone(error);
            onDone();
        });
    });
};


var setupSchema = function (client, onDone, definitions) {
    definitions = definitions || JSON.parse(Fs.readFileSync('assets/es_schema.json'));
    var keys = Object.keys(definitions);
    if (!keys.length) return onDone();
    var type = keys.pop();
    var definition = definitions[type];
    delete definitions[type];
    var body = {};
    body[type] = {properties: definition};
    client.indices.putMapping({
        index: INDEX_NAME,
        type: type,
        body: body
    }, function (error) {
        if (error) return onDone(error);
        setupSchema(client, onDone, definitions);
    });
};


var defineInterface = function(client){

	var _interface = {};
	var bulk = [];
	var bulkSize = 0;

	_interface.putBulk = function(atom){
    // add an element to the request and return the bulk sizes
		var request = {_index: INDEX_NAME, _type: atom.type.id};
    if (atom.id) request._id = atom.id;
    bulk.push({index: request}, atom.type.write(atom));
		return ++bulkSize;
	};


	_interface.commitBulk = function(onDone){

		if (!bulk.length && onDone) return process.nextTick(onDone);
        client.bulk({body: bulk}, function (error) {
            if (error) return onDone ? onDone(error) : console.error(error);
            if (onDone) onDone();
        });
		bulk = []; bulkSize = 0;

	};

	_interface.put = function (atom, onDone) {
        var request = {
            index: INDEX,
            type: atom.type.id,
            body: atom.type.write(atom)
        };
        if (atom.id) request.id = atom.id;
        client.index(request, function (error, response) {
            if (error) return (onDone ? onDone(error) : log.error(error));
            atom.id = response._id;
            if (onDone) onDone();
        });
    };

    _interface.delete = function (typeId, atomId, onDone) {
        client.delete({
            index: INDEX,
            id: atomId,
            type: typeId
        }, onDone || Log.error);
    };

	_interface.get = function ( atomType, atomId, onDone) {
    console.log("client: getting.")
        client.get({
            index: INDEX,
            type: atomType
            id: atomId,
            type: '_all',
            _source: true
        }, function (error, response) {
            if (error) return onDone(error);
            var type = getType(response._type);
            var atom = type.read(response._source, atomId);
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

    _interface.forEach = function (options) {

    	options = options || {};

        from = options.from || 0;
        size = options.size || 1000;

        _interface.search(query, function (error, result) {
            if (error) return onError(error);
            var items = result.hits;
            for (var i = 0; i < items.length; i++) {
            	try{
            		(options.onItem || console.log)(items[i]);
            	}catch(error){
            		return (options.onError || console.error)(error);
            	}
            }
            options.from = from + size;
            if (nextIndex < result.total) {
                _interface.forEach(options);
            } else {
                if (options.onDone) options.onDone();
            }
        }, {from: from, size: size});
    };

    _interface.deleteByQuery = function(query, onDone){
    	query = query.compile(INDEX_NAME);
    	query.scroll = '30s';
    	query.type = 'scan';
    	query.fields = ['_id'];
        client.search(query, function deleteHitsAndGoOn(error, response){
        	if(error) return onDone(error);
        	deleteHits(response.hits.hits, function(error){
        		if(error) return onDone(error);
        		if(response.hits.total>0){
	 				client.scroll({
	 					scrollId: response._scroll_id,
	 					scroll: '30s'
	 				}, deleteHitsAndGoOn);
 				}
        	});
        });
    };

    var deleteHits = function(hits, onDone){
    	if(!hits.length) return onDone();
    	var bulk = [];
    	hits.forEach(function(hit){
    		bulk.push({
    			delete: {_index: INDEX_NAME, _type: hit._type, _id: hit._id}
    		});
    	});
    	client.bulk({bulk: bulk}, onDone);
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
        }, onDone || Log.error);
    };

    _interface.close = function () {
        client.close();
    };

	return _interface;
};


var parseHits = function (response) {
    var hits = [];
    if (response.hits) {
        response.hits.hits.forEach( function (hit) {
            var type = getType(hit._type);
            var atom = type.read(hit._source, hit._id);
            hits.push(atom);
        });
    }
    return hits;
};
