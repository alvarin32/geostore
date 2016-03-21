var Gui = require('./gui');
var F = require('client/fiat');
var I18n = require('client/i18n');

module.exports = function (application, onDone) {

    var container = Gui.createContainer();

    var label = F.node('div')
        .style({height: cm(1.5), lineHeight: cm(1.5), fontSize: cm(0.5)})
        .text(I18n.get(['backup', 'wait']));
    var progressBar = Gui.createProgressBar();

    F.body.append(container.append(label, progressBar));

    var onDownloadReady = function (error, route) {

        var message = error
            ? F.node('span').style({color: colors.error, display: 'block'}).text(I18n.get(error))
            : F.node('a').style({color: colors.success, display: 'block'}).attr({href: route}).text(route);

        var button = Gui.createButton(['commons', error ? 'buttonSad' : 'buttonHappy'])
            .style({marginTop: cm(0.5)}).on('click', container.hide.bind(null, onDone));

        progressBar.animate({opacity: 0}, {
            onDone: function () {
                progressBar.remove();
                label.text(I18n.get(error ? ['backup', 'error'] : ['backup', 'ready']));
                container.append(message, button);
            }
        });

    };

    container.show(function () {
        var ether = application.ether;

        ether.register('backup/progress', progressBar.onProgress);
        application.ether.call('/api/backup', function (error, route) {
            ether.deregister('backup/progress', progressBar.onProgress);
            onDownloadReady(error, route);
        });
    });
};


