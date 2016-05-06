/*
 * Models for Xstream and what not
 * Dependencies: none
 * Params: Knockout, JSON
 */
define(function () {

    var Model = window.Model = window.Model || {};

    Model.Song = function (ko, data) {

        // Friendly reference to this.
        var self = this;

        self.Id = ko.observable(data.Id);
        self.Thumb = ko.observable(data.Thumb);
        self.Title = ko.observable(data.Title);

    };

    return Model;
})
