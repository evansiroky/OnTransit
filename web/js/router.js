var $ = require('jquery'),
  Backbone = require('Backbone');

module.exports = function(app) {

  var Router = Backbone.Router.extend({

    routes: {
      "": "home",
      "findVehicle/": "findVehicle",
      "tripDetails/": "tripDetails",
      "feedback/": "feedback"
    },

    home: function() {
      console.log('router home');
      this.changePage('#home');
    },

    findVehicle: function() {
      console.log('router findVehicle');
      this.changePage('#find_vehicle');
    },

    tripDetails: function() {
      console.log('router tripDetails');
      this.changePage('#find_vehicle');
    },

    feedback: function() {
      console.log('router feedback');
      this.changePage('#find_vehicle');
    },

    changePage: function(el) {
      $("body").pagecontainer("change", $(el), { reverse: false, changeHash: false });
    }

  });

  app.router = new Router();
  Backbone.history.start({pushState: true});

}