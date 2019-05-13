// Karma configuration
// Generated on 2016-10-06

module.exports = function(config) {
    'use strict';

    config.set({
        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,

        // base path, that will be used to resolve files and exclude
        basePath: '../',

        // testing framework to use (jasmine/mocha/qunit/...)
        // as well as any additional frameworks (requirejs/chai/sinon/...)
        frameworks: [
            'jasmine'
        ],

        // list of files / patterns to load in the browser
        files: [
            // bower:js
            'bower_components/jquery/dist/jquery.js',
            'bower_components/angular/angular.js',
            'bower_components/bootstrap/dist/js/bootstrap.js',
            'bower_components/angular-animate/angular-animate.js',
            'bower_components/angular-aria/angular-aria.js',
            'bower_components/angular-cookies/angular-cookies.js',
            'bower_components/angular-messages/angular-messages.js',
            'bower_components/angular-resource/angular-resource.js',
            'bower_components/angular-route/angular-route.js',
            'bower_components/angular-sanitize/angular-sanitize.js',
            'bower_components/angular-touch/angular-touch.js',
            'bower_components/angularjs-slider/dist/rzslider.js',
            'bower_components/bootstrap-switch/dist/js/bootstrap-switch.js',
            'bower_components/angular-bootstrap-switch/dist/angular-bootstrap-switch.js',
            'bower_components/ng-file-upload/ng-file-upload.js',
            'bower_components/marked/lib/marked.js',
            'bower_components/angular-marked/dist/angular-marked.js',
            'bower_components/moment/moment.js',
            'bower_components/angular-moment/angular-moment.js',
            'bower_components/angular-slugify/angular-slugify.js',
            'bower_components/pusher-angular/lib/pusher-angular.js',
            'bower_components/pusher-websocket-iso/dist/web/pusher.js',
            'bower_components/angular-file-upload/dist/angular-file-upload.min.js',
            'bower_components/angular-elastic/elastic.js',
            'bower_components/randomcolor/randomColor.js',
            'bower_components/angular-material/angular-material.js',
            'bower_components/angular-wizard/dist/angular-wizard.min.js',
            'bower_components/angular-audio/app/angular.audio.js',
            'bower_components/angular-clipboard/angular-clipboard.js',
            'bower_components/angular-bootstrap-contextmenu/contextMenu.js',
            'bower_components/js-xlsx/dist/xlsx.core.min.js',
            'bower_components/ngDraggable/ngDraggable.js',
            'bower_components/ng-idle/angular-idle.js',
            'bower_components/simple-web-notification/web-notification.js',
            'bower_components/angular-web-notification/angular-web-notification.js',
            'bower_components/angular-websocket/dist/angular-websocket.js',
            'bower_components/angular-drag-and-drop-lists/angular-drag-and-drop-lists.js',
            'bower_components/ng-material-datetimepicker/js/angular-material-datetimepicker.js',
            'bower_components/mdPickers/dist/mdPickers.min.js',
            'bower_components/angular-material-data-table/dist/md-data-table.js',
            'bower_components/paste-image/dist/paste-image.min.js',
            'bower_components/angular-payments/lib/angular-payments.js',
            'bower_components/wavesurfer.js/dist/wavesurfer.js',
            'bower_components/angular-bowser/src/angular-bowser.js',
            'bower_components/spectrum/spectrum.js',
            'bower_components/angular-spectrum-colorpicker/dist/angular-spectrum-colorpicker.min.js',
            'bower_components/rangy/rangy-core.js',
            'bower_components/rangy/rangy-classapplier.js',
            'bower_components/rangy/rangy-highlighter.js',
            'bower_components/rangy/rangy-selectionsaverestore.js',
            'bower_components/rangy/rangy-serializer.js',
            'bower_components/rangy/rangy-textrange.js',
            'bower_components/textAngular/dist/textAngular.js',
            'bower_components/textAngular/dist/textAngular-sanitize.js',
            'bower_components/textAngular/dist/textAngularSetup.js',
            'bower_components/moment-round/dist/moment-round.min.js',
            'bower_components/angular-ui-mask/dist/mask.js',
            'bower_components/eonasdan-bootstrap-datetimepicker/build/js/bootstrap-datetimepicker.min.js',
            'bower_components/angular-eonasdan-datetimepicker/dist/angular-eonasdan-datetimepicker.js',
            'bower_components/moment-timezone/builds/moment-timezone-with-data-2012-2022.js',
            'bower_components/lightbox2/dist/js/lightbox.js',
            'bower_components/ng-dialog/js/ngDialog.js',
            'bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
            'bower_components/bootstrap-ui-datetime-picker/dist/datetime-picker.js',
            'bower_components/blob-polyfill/Blob.js',
            'bower_components/file-saver.js/FileSaver.js',
            'bower_components/angular-file-saver/dist/angular-file-saver.bundle.js',
            'bower_components/angular-ui-ace/ui-ace.js',
            'bower_components/angular-ui-select/dist/select.js',
            'bower_components/angular-ckeditor/angular-ckeditor.js',
            'bower_components/ng-formio/dist/formio.js',
            'bower_components/clusterize/clusterize.js',
            'bower_components/ng-csv/build/ng-csv.min.js',
            'bower_components/ngWig/dist/ng-wig.js',
            'bower_components/firebase/firebase.js',
            'bower_components/angularfire/dist/angularfire.js',
            'bower_components/ng-debounce/angular-debounce.js',
            'bower_components/angular-mocks/angular-mocks.js',
            'bower_components/satellizer/dist/satellizer.js',
            'bower_components/angular-strap/dist/angular-strap.js',
            'bower_components/angular-strap/dist/angular-strap.tpl.js',
            'bower_components/angular-ui-router/release/angular-ui-router.js',
            'bower_components/jScrollPane/script/jquery.mousewheel.js',
            'bower_components/jScrollPane/script/mwheelIntent.js',
            'bower_components/jScrollPane/script/jquery.jscrollpane.js',
            'bower_components/jScrollPane/script/jquery.jscrollpane.min.js',
            'bower_components/bootstrap3-dialog/dist/js/bootstrap-dialog.min.js',
            'bower_components/jquery-ui/jquery-ui.js',
            'bower_components/blueimp-file-upload/js/jquery.fileupload.js',
            'bower_components/ng-tags-input/ng-tags-input.js',
            'bower_components/humanize-duration/humanize-duration.js',
            'bower_components/angular-timer/dist/angular-timer.js',
            'bower_components/angular-js-xlsx/angular-js-xlsx.js',
            'bower_components/angular-google-chart/ng-google-chart.js',
            'bower_components/angular-highlightjs/build/angular-highlightjs.js',
            'bower_components/json3/lib/json3.js',
            'bower_components/highlightjs/highlight.pack.js',
            'bower_components/d3/d3.js',
            'bower_components/nvd3/build/nv.d3.js',
            'bower_components/angular-nvd3/dist/angular-nvd3.js',
            // endbower
            'app/scripts/**/*.js',
            'test/mock/**/*.js',
            'test/spec/**/*.js'
        ],

        // list of files / patterns to exclude
        exclude: [],

        // web server port
        port: 8080,

        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera
        // - Safari (only Mac)
        // - PhantomJS
        // - IE (only Windows)
        browsers: [
            'PhantomJS'
        ],

        // Which plugins to enable
        plugins: [
            'karma-phantomjs-launcher',
            'karma-jasmine'
        ],

        // Continuous Integration mode
        // if true, it capture browsers, run tests and exit
        singleRun: false,

        colors: true,

        // level of logging
        // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
        logLevel: config.LOG_INFO,

        // Uncomment the following lines if you are using grunt's server to run the tests
        // proxies: {
        //   '/': 'http://localhost:9000/'
        // },
        // URL root prevent conflicts with the site root
        // urlRoot: '_karma_'
    });
};