require.config({
    paths: {
        'jquery': 'Libs/jquery-1.11.1.min',
        'jquery-ui': 'Libs/jQueryUI/jquery-ui.min',
        'knockout': 'Libs/knockout-3.3.0',
        'viewmodel': 'gabeChatKo',
        'model':'Models',
        'boot': 'Libs/bootstrap',
        'ace': 'Libs/src-noconflict/ace'
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
        'viewmodel', ,
        'model',
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