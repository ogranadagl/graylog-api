const request = require('request');
const methods = require('./api-methods');

function serializeObjToUri(obj) {
  return Object.keys(obj)
    .map(function(key) {
      return key + '=' + encodeURIComponent(obj[key]);
    })
    .join('&');
}

function Api(config={}) {
  const basicAuthToken = config.basicAuth
    ? config.basicAuth.username + ':' + config.basicAuth.password + '@'
    : '';
  const protocol = config.protocol || 'http';
  const host = config.host || 'localhost';
  const port = config.port || '9000';
  const path = config.path || '/api';
  this._uri = `${protocol}://${basicAuthToken}${host}:${port}${path}`
};

Object.keys(methods).forEach(function(mName) {
  const m = methods[mName];

  Api.prototype[mName] = function(parameters, path, callback) {
    if (arguments.length === 1 && parameters.apply) callback = parameters;
    if (arguments.length === 2 && path.apply) callback = path;

    let computedPath = m.path;
    if (typeof arguments[1] === 'object') {
      computedPath = m.path.replace(/{([^}]*)}/g, function(s, p) {
        return path[p];
      });
    }

    let reqUri = this._uri + computedPath;

    if (m.method === 'GET' && parameters) {
      reqUri = reqUri + '?' + serializeObjToUri(parameters);
    }

    const opts = {
      url: reqUri,
      method: m.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: m.method !== 'GET' && parameters ? parameters : null,
      json: false
    };
    return new Promise((resolve, reject) => {
      request(opts, function(error, response, body) {
        if (body === '') body = '{}';
        if (error) {
          const resp = [error, body];
          if (callback) {
            reject(resp);
            return callback(resp);
          } else {
            return reject(resp);
          }
        }
        if (response.statusCode === 403) {
          const resp = [JSON.parse(body).message, body];
          if (callback) {
            reject(resp);
            return callback(resp);
          } else {
            return reject(resp);
          }
        }
  
        var parsedBody;
        try {
          parsedBody = JSON.parse(body);
        } catch (err) {
          const resp = ['Bad response', err, reqUri];
          if (callback) {
            reject(resp);
            return callback(resp);
          } else {
            return reject(resp);
          }
        }
        if (callback) {
          resolve(parsedBody);
          callback(null, parsedBody);
        } else {
          resolve(parsedBody);
        }
      });
    });
  };
});

var connect = function(config, callback) {
  var that = new Api(config);
  return that;
};

connect.connect = connect; // backwards compatible
connect.Api = Api;
module.exports = connect;
