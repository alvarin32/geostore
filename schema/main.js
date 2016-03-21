var Schema = require('elastic/schema');

//TYPES:
var Session = require('./session');
var Node = require('./node');
var Way = require('./way');
var Relation = require('./relation');
var OsmState = require('./osm_state');
var Scenario = require('./scenario');

Schema.defineType(Session.type);
Schema.defineType(Node.type);
Schema.defineType(Way.type);
Schema.defineType(Relation.type);
Schema.defineType(OsmState.type);
Schema.defineType(Scenario.type);

module.exports = Schema;