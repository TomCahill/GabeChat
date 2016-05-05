require.config({
    paths: {
        'jquery': 'jquery-1.11.1.min',
        'jquery-ui': 'jQueryUI/jquery-ui.min',
        'knockout': 'knockout-3.3.0',
        'viewmodel': 'gabeChatKo',
        'boot': 'bootstrap',
        'ace': 'src-noconflict/ace'
    },
    shim: {
        "jquery": {
            exports: "$"
        },
        "jquery-ui": {
            deps: ['jquery']
        },
        "boot": {
            deps: ['jquery']
        }
    },
})
require(
    [
        'jquery',
        'jquery-ui',
        'knockout',
        'viewmodel',
        'boot',
        'ace',
    ],
    function ($, jqueryui, ko, gabe) {

        var viewModel = new gabe.ViewModel($, ko);

        // Bind to page.
        ko.applyBindings(viewModel, document.getElementById("theBodyOfGabe"));

        //init page
        viewModel.fn.construct();
    }
);