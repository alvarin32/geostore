var Elastic = require('elastic');
var Schema = require('elastic/schema');
var Query = require('elastic/query');
var Through = require('through2');

//TYPES:
var Session = require('./schema/session');
var Node = require('./schema/node');
var Way = require('./schema/way');
var Relation = require('./schema/relation');

Schema.defineType(Session.type);
Schema.defineType(Node.type);
Schema.defineType(Way.type);
Schema.defineType(Relation.type);


exports.start = function (name, onDone) {

    var extend = function (elastic) {

        elastic.writeBackup = function (stream, onProgress, onDone) {

            elastic.count(Query.all(), function (error, total) {
                if (error) return onDone(error);
                var written = 0, lastUpdate = 0;
                var writeElements = function (types, onDone) {
                    if (!types.length) return onDone();
                    var type = types.pop();
                    var query = Query.type(type);
                    elastic.count(query, function (error, count) {
                        if (error) return onDone(error);
                        stream.write(type.id + ':' + count + '\n');
                        elastic.forEach(query, {
                            onItem: function (element) {
                                stream.write(element.id + ':');
                                stream.write(JSON.stringify(type.write(element)));
                                stream.write('\n');
                                var progress = (++written) / total;
                                if ((progress - lastUpdate) > 0.01) {
                                    onProgress(progress);
                                    lastUpdate = progress;
                                }
                            },
                            onDone: function (error) {
                                if (error) return onDone(error);
                                writeElements(types, onDone);
                            }
                        });
                    });
                };

                stream.write((new Date()).toUTCString() + '\n');
                stream.write(total.toString() + '\n');
                writeElements([Node.type, Way.type, Relation.type], onDone);

            });
        };

        elastic.readBackup = function (stream, onProgress, onDone) {

            var total, totalRead = 0, lastUpdate = 0;

            var currentParser = function (line, onDone) {
                console.log(line);
                return onDone(undefined, totalParser);
            };

            var totalParser = function (line, onDone) {
                total = parseInt(line);
                if (total == 0) return onDone();
                onDone(undefined, typeParser);
            };

            var typeParser = function (line, onDone) {
                var parts = line.split(':');
                var typeId = parts[0];
                var numberOfElements = parseInt(parts[1]);
                var parser = createElementParser(typeId, numberOfElements);
                onDone(undefined, parser);
            };

            var BULK_SIZE = 1000;
            var createElementParser = function (typeId, numberOfElements) {

                var read = 0;
                var type = Schema.getType(typeId);

                var readAtom = function (line) {
                    var separator = line.indexOf(':');
                    var id = line.substring(0, separator);
                    var body = JSON.parse(line.substring(separator + 1));
                    var atom = type.read(body);
                    atom.id = id;
                    atom.type = type;
                    return atom;
                };

                var parser = function (line, onDone) {
                    var atom = readAtom(line);
                    read++;
                    totalRead++;
                    var nextParser = (read == numberOfElements) ? typeParser : parser;
                    if (elastic.putBulk(atom) < BULK_SIZE) return onDone(undefined, nextParser);
                    commitBulk(onDone, nextParser);
                };

                return parser;
            };

            var commitBulk = function (onDone, newParser) {
                elastic.commitBulk(function (error) {
                    if (error) return onDone(error);
                    var progress = totalRead / total;
                    if ((progress - lastUpdate) > 0.01) {
                        onProgress(progress);
                        lastUpdate = progress;
                    }
                    onDone(undefined, newParser);
                })
            };

            var parseLine = function (line, onDone) {
                currentParser(line, function (error, nextParser) {
                    if (error) return onDone(error);
                    currentParser = nextParser;
                    return onDone();
                });
            };

            var string = '';
            var parseString = function (goOn) {
                var bound = string.indexOf('\n');
                if (bound < 0) return goOn();
                var current = string.substring(0, bound);
                string = string.substring(bound + 1);
                parseLine(current, function (error) {
                    if (error) return onDone(error);
                    if (totalRead == total) return commitBulk(onDone);
                    process.nextTick(parseString.bind(null, goOn));
                });
            };

            stream.pipe(Through(function (chunk, encoding, callback) {
                string += chunk.toString();
                parseString(callback);
            }));
        };
    };

    var elastic = Elastic.createClient(name);
    extend(elastic);
    elastic.setup(function (error) {
        if (error) return onDone(error);
        onDone(undefined, elastic);
    });
};