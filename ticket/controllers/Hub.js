'use strict';

var url = require('url');

var Hub = require('./HubService');

module.exports.createHub = function createHub (req, res, next) {
  Hub.createHub(req.swagger.params, res, next);
};

module.exports.deleteHub = function deleteHub (req, res, next) {
  Hub.deleteHub(req.swagger.params, res, next);
};

module.exports.retrieveHub = function retrieveHub (req, res, next) {
  Hub.retrieveHub(req.swagger.params, res, next);
};

module.exports.retrieveHubs = function retrieveHubs (req, res, next) {
  Hub.retrieveHubs(req.swagger.params, res, next);
};
