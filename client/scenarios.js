var Gui = require('./gui');
var F = require('client/fiat');
var I18n = require('client/i18n');
var Main = require('./scenario/main');
var Schema = require('elastic/schema');
var Tiles = require('map/tiles');

module.exports = function (application, onDone) {

    var showError = function (error) {
        var container = Gui.createContainer();
        var label = F.node('div').style({color: colors.error}).text(I18n.get(error));
        var button = Gui.createButton(['commons', 'buttonSad']);
        container.append(label, button).show();
        button.on('click', container.hide.bind(container, onDone));
    };

    var waitingIcon = Gui.createWaitingIcon({delay: 300}).style({
        width: cm(2), height: cm(2),
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
        margin: 'auto'
    });
    F.body.append(waitingIcon);
    application.ether.call('scenarios/list', function (error, answer) {
        waitingIcon.stop(function () {
            waitingIcon.remove();
            if (error) return showError(error);
            var osmState = Schema.fromWire(answer.osmState);
            osmState.bounds.hidden = true;
            answer.scenarios.forEach(function (scenario) {
                var button = renderScenarioButton(scenario, osmState.bounds);
                F.body.append(button);
            });
            F.body.append(renderCreateButton());
        });
    });


    var renderScenarioButton = function (scenario, defaultBounds) {
        var container = F.node('div').style({width: '100%', cursor: 'pointer', margin: cm(0.5)});
        var icon = Gui.createGeoIcon({provider: Tiles.providers.GOOGLE})
            .style({
                height: cm(2),
                width: cm(2),
                display: 'inline-block',
                verticalAlign: 'middle',
                margin: cm(0.25)
            })
            .update(scenario.bounds || defaultBounds);

        var descriptionText = I18n.get(['scenario', 'description'])
            .replace('%date%', (new Date(scenario.created)).toLocaleDateString())
            .replace('%creator%', scenario.creator);

        var description = F.node('div')
            .style({
                height: cm(1),
                display: 'inline-block',
                verticalAlign: 'middle',
                textAlign: 'left'
            })
            .append(
                F.node('div')
                    .style({fontSize: cm(0.4), fontWeight: 'bold'})
                    .text(scenario.name || I18n.get(['scenario', 'noName'])),
                F.node('div')
                    .style({fontSize: cm(0.2), marginTop: cm(0.3)})
                    .text(descriptionText)
            );

        container.on('click', function () {
            start(scenario);
            return false;
        });

        return container.append(icon, description);
    };

    var renderCreateButton = function () {
        var container = F.node('div').style({
            width: '100%',
            cursor: 'pointer',
            height: cm(3),
            lineHeight: cm(3),
            textAlign: 'center'
        });

        container.append(Gui.createIcon('/images/create.svg').style({width: cm(2), height: cm(2)}));

        container.on('click', function () {
            create();
            return false;
        });

        return container;
    };


    var start = function (scenario) {
        F.body.clear();
        Main.start(scenario, onDone);
    };

    var create = function () {
        F.body.clear();
        var waitingIcon = Gui.createWaitingIcon({delay: 300}).appendTo(F.body);
        application.ether.call('scenarios/create', function (error, scenario) {
            waitingIcon.stop(function () {
                waitingIcon.remove();
                if (error) return showError(error);
                start(Schema.fromWire(scenario));
            });
        });
    };

};