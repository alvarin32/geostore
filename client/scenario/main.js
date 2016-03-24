var Stage = require('./stage');
var I18n = require('client/i18n');
var Input = require('./input');
var F = require('client/fiat');
var Observable = require('commons/observable');
var Commons = require('commons');
var GeoTools = require('geometry/tools');
var Gui = require('client/gui');
var Keys = require('../keys');

var Graph = require('./graph');
var Flood = require('./flood');
var Bridges = require('./bridges');
var Timespan = require('./timespan');


exports.start = function (application, scenario, onStop) {

    var observeScenario = function () {
        scenario = Observable.wrap(scenario);
        var endpoint = 'scenario/update';
        application.ether.register(endpoint, function (update) {
            scenario.emit(update.type, update.value);
        });
        onStop = Commons.sequence(onStop, function () {
            application.ether.deregister(endpoint);
        });
        application.ether.notify('scenarios/listen', scenario.id);
    };

    var showTitle = function () {
        var label = F.node('div').style({
            fontSize: cm(0.4), color: colors.bright,
            fontWeight: 'bold', cursor: 'pointer'
        });
        var update = function () {
            label.text(scenario.name || I18n.get(['scenario', 'noName']));
            return label;
        };
        var modify = function () {
            input.askForString({
                preset: scenario.name,
                onConfirmed: function (string) {
                    application.ether.notify('scenarios/setName', {scenarioId: scenario.id, name: string});
                }
            });
            return false;
        };
        scenario.on('name', function (newName) {
            scenario.name = newName;
            update();
        });
        label.on('click', modify);
        stage.header.title.push(label);
        update();
    };

    var goToBounds = function (delay) {
        stage.map.container.onAttached(function () {
            setTimeout(function () {
                var bounds = scenario.bounds || application.state.bounds;
                stage.map.goToGeo(bounds, true);
                scenario.on('bounds', function (bounds) {
                    bounds = GeoTools.fromGeoJson(bounds);
                    scenario.bounds = bounds;
                    stage.map.goToGeo(bounds, true);
                });
            }, delay);
        });
    };

    var showCloseIcon = function () {
        var closeIcon = Gui.createIcon('/images/cancel.svg', {color: colors.darker});
        closeIcon.on('click', stop);
        stage.header.right.push(closeIcon);
    };

    var setupModes = function () {
        var menuIcon = Gui.createIcon('/images/mode.svg', {color: colors.darker});

        stage.header.left.push(menuIcon);
        menuIcon.on('click', function () {
            stage.menu.toggle();
            return false;
        });

        var floodIcon = setupMode(floodMode, '/images/flood.svg', '#3C7BD5');
        var graphIcon = setupMode(graphMode, '/images/graph.svg', '#3FB87E');
        var bridgeIcon = setupMode(bridgeMode, '/images/bridges.svg', '#D54B81');
        stage.menu.append(floodIcon, graphIcon, bridgeIcon);
    };

    var setupMode = function (mode, iconSource, color) {

        var start = function () {
            stage.menu.animate({backgroundColor: color});
            stage.menu.hide(function () {
                var children = stage.menu.children();
                var stop = function () {
                    mode.stop && mode.stop();
                    stage.menu.animate({backgroundColor: colors.darker});
                    stage.menu.hide(function () {
                        stage.menu.clear().append.apply(this, children);
                        stage.header.left.pop();
                        stage.header.right.pop();
                    });
                    return false;
                };
                Keys.once(27, stop);
                var stopIcon = Gui.createIcon('/images/cancel.svg', {color: colors.darker}).on('click', stop);
                stage.menu.clear();
                stage.header.left.push(headerIcon);
                stage.header.right.push(stopIcon);
                mode.start && mode.start();
            });
        };

        var startIcon = Gui.createIcon(iconSource, {color: color})
            .style({width: cm(1), height: cm(1)})
            .on('click', start);
        var headerIcon = Gui.createIcon(iconSource, {color: color})
            .style({width: cm(1), height: cm(1)})
            .on('click', stage.menu.toggle);

        return startIcon;
    };

    var start = function () {
        showTitle();
        goToBounds(1000);
        showCloseIcon();
        setupModes();
    };

    var stop = function () {
        F.body.clear();
        onStop();
    };


    observeScenario();
    var stage = Stage();
    var input = Input(stage);
    var modeContext = Observable.wrap({
        application: application,
        scenario: scenario,
        stage: stage,
        input: input
    });
    var floodMode = Flood(modeContext);
    var bridgeMode = Bridges(modeContext, floodMode);
    var graphMode = Graph(modeContext, floodMode, bridgeMode);
    var timeSpan = Timespan(modeContext);
    stage.start(start);
    timeSpan.appendTo(F.body);

};
