import { test, moduleForComponent } from 'ember-qunit';
import startApp from '../../helpers/start-app';
import Ember from 'ember';
import Token from 'ember-simple-auth-token/authenticators/token';
import Configuration from 'ember-simple-auth-token/configuration';

var App;

module('Token Authenticator', {
  beforeEach: function() {
    App = startApp();
    App.xhr = sinon.useFakeXMLHttpRequest();
    App.server = sinon.fakeServer.create();
    App.server.autoRespond = true;
    App.authenticator = Token.create();
    sinon.spy(Ember.$, 'ajax');
  },
  afterEach: function() {
    Ember.$.ajax.restore();
    App.xhr.restore();
    Ember.run(App, App.destroy);
  }
});

test('assigns serverTokenEndpoint from the configuration object', function() {
  Configuration.serverTokenEndpoint = 'serverTokenEndpoint';

  equal(Token.create().serverTokenEndpoint, 'serverTokenEndpoint');

  Configuration.load({}, {});
});

test('assigns identificationField from the configuration object', function() {
  Configuration.identificationField = 'identificationField';

  equal(Token.create().identificationField, 'identificationField');

  Configuration.load({}, {});
});

test('assigns passwordField from the configuration object', function() {
  Configuration.passwordField = 'passwordField';

  equal(Token.create().passwordField, 'passwordField');

  Configuration.load({}, {});
});

test('assigns tokenPropertyName from the configuration object', function() {
  Configuration.tokenPropertyName = 'tokenPropertyName';

  equal(Token.create().tokenPropertyName, 'tokenPropertyName');

  Configuration.load({}, {});
});

test('assigns custom headers from the configuration object', function() {
  Configuration.headers = 'headers';

  equal(Token.create().headers, 'headers');

  Configuration.load({}, {});
});

test('#restore resolves with the correct data', function() {
  var properties = {
    token: 'secret token!'
  };

  App.server.respondWith('POST', '/api-token-auth/', [
    201, {
      'Content-Type': 'application/json'
    },
    '{ "token": "secret token!" }'
  ]);

  Ember.run(function() {
    App.authenticator.restore(properties).then(function(content) {
      deepEqual(content, properties);
    });
  });
});

test('#restore resolves custom token with the correct data', function() {
  Configuration.tokenPropertyName = 'user.data.token';

  App.authenticator = Token.create();

  var properties = {
    user: {
      data: {
        token: 'secret token!'
      }
    }
  };

  App.server.respondWith('POST', '/api-token-auth/', [
    201, {
      'Content-Type': 'application/json'
    },
    '{ "token": "secret token!" }'
  ]);

  Ember.run(function() {
    App.authenticator.restore(properties).then(function(content) {
      deepEqual(content, properties);
    });
  });
});

test('#authenticate sends an AJAX request to the sign in endpoint', function() {
  var credentials = {
    identification: 'username',
    password: 'password'
  };

  App.authenticator.authenticate(credentials);

  Ember.run(function() {
    var args = Ember.$.ajax.getCall(0).args[0];
    delete args.beforeSend;
    deepEqual(args, {
      url: '/api-token-auth/',
      method: 'POST',
      data: '{"password":"password","username":"username"}',
      dataType: 'json',
      contentType: 'application/json',
      headers: {}
    });
  });
});

test('#authenticate sends an AJAX request to the sign in endpoint with custom fields', function() {
  var credentials = {
    identification: 'username',
    password: 'password'
  };

  Configuration.identificationField = 'api-user';
  Configuration.passwordField = 'api-key';

  App.authenticator = Token.create();
  App.authenticator.authenticate(credentials);

  Ember.run(function() {
    var args = Ember.$.ajax.getCall(0).args[0];
    delete args.beforeSend;

    deepEqual(args, {
      url: '/api-token-auth/',
      method: 'POST',
      data: '{"api-key":"password","api-user":"username"}',
      dataType: 'json',
      contentType: 'application/json',
      headers: {}
    });
  });
});

test('#authenticate successfully resolves with the correct data', function() {
  var credentials = {
    email: 'email@address.com',
    password: 'password'
  };

  App.server.respondWith('POST', '/api-token-auth/', [
    201, {
      'Content-Type': 'application/json'
    },
    '{ "access_token": "secret token!" }'
  ]);

  return App.authenticator
    .authenticate(credentials)
    .then(
    function (data) {
      deepEqual(data, {
        access_token: 'secret token!'
      });
    }
  );
});

test('#authenticate sends an AJAX request with custom headers', function() {
  var credentials = {
    identification: 'username',
    password: 'password'
  };

  Configuration.headers = {
    'X-API-KEY': '123-abc',
    'X-ANOTHER-HEADER': 0
  };
  App.authenticator = Token.create();
  App.authenticator.authenticate(credentials);

  Ember.run(function() {
    var args = Ember.$.ajax.getCall(0).args[0];
    delete args.beforeSend;
    deepEqual(args, {
      url: '/api-token-auth/',
      method: 'POST',
      data: '{"password":"password","username":"username"}',
      dataType: 'json',
      contentType: 'application/json',
      headers: {
        'X-API-KEY': '123-abc',
        'X-ANOTHER-HEADER': 0
      }
    });
  });
});

test('#authenticate rejects with the correct error', function() {
  var credentials = {
    email: 'email@address.com',
    password: 'password'
  };

  App.server.respondWith('POST', '/api-token-auth/', [
    400, {
      'Content-Type': 'application/json'
    },
    '{ "error": "invalid_grant" }'
  ]);

  Ember.run(function() {
    App.authenticator.authenticate(credentials).then(null, function(error) {
      deepEqual(error, {
        'error': 'invalid_grant'
      });
    });
  });
});

test('#invalidate returns a resolving promise', function() {
  App.authenticator.invalidate().then(function() {
    ok(true);
  });
});
