var Stage = require('./stage');
var I18n = require('client/i18n');
var Input = require('./input');
var F = require('client/fiat');
var Observable = require('commons/observable');
var Commons = require('commons');
var Schema = require('elastic/schema');
var Gui = require('client/gui');


exports.start = function (application, scenario, onStop) {

    var observeScenario = function () {
        scenario = Observable.wrap(scenario);
        var endpoint = 'scenario/update/' + scenario.id;
        application.ether.register(endpoint, function (newVersion) {
            newVersion = Schema.fromWire(newVersion);
            for (var key in newVersion) {
                scenario[key] = newVersion[key];
            }
            scenario.emit('update');
        });
        onStop = Commons.sequence(onStop, function () {
            application.ether.deregister(endpoint);
        });
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
        scenario.on('update', update);
        label.on('click', modify);
        stage.header.title.push(label);
        update();
    };

    var goToBounds = function (delay) {
        stage.map.container.onAttached(function () {
            setTimeout(function () {
                var bounds = scenario.bounds || application.state.bounds;
                stage.map.goToGeo(bounds, true);
            }, delay);
        });
    };

    var showCloseIcon = function () {
        var closeIcon = Gui.createIcon('/images/cancel.svg', {color: colors.darker});
        closeIcon.on('click', stop);
        stage.header.right.push(closeIcon);
    };

    var startTools = function () {

    };

    var start = function () {
        observeScenario();
        showTitle();
        goToBounds(1000);
        showCloseIcon();
        startTools();
    };

    var stop = function () {
        F.body.clear();
        onStop();
    };


    var stage = Stage();
    var input = Input(stage);
    stage.start(start);

};
