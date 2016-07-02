'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.start = start;

var _messageHandlers = require('./messageHandlers');

var _slackbot = require('./slackbot');

var _slackbot2 = _interopRequireDefault(_slackbot);

var _facebookbot = require('./facebookbot');

var _facebookbot2 = _interopRequireDefault(_facebookbot);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function start(platform, platformConfig, serverOptions, firebaseOptions) {
  var controller = void 0;
  var messageEvents = void 0;
  if (platform === 'slack') {
    controller = (0, _slackbot2.default)(platformConfig, firebaseOptions);
    messageEvents = _slackbot.slackMessageEvents;
  } else if (platform === 'facebook') {
    controller = (0, _facebookbot2.default)(platformConfig);
    messageEvents = _facebookbot.facebookMessageEvents;
  } else {
    throw new Error('platform ' + platform + ' not supported');
  }

  controller.setupWebserver(serverOptions.port, function (err, webserver) {
    if (platform === 'slack') {
      (function () {
        var trackBot = function trackBot(bot) {
          bots[bot.config.token] = bot;
        };

        // Reloads bots incase of server restart


        controller.createWebhookEndpoints(controller.webserver);
        // Oauth redirect uri for slack
        controller.createOauthEndpoints(controller.webserver, function (err, req, res) {
          if (err) {
            res.status(500).send('ERROR: ' + err);
            return;
          }

          res.send('Success!');
        });
        // Slack creates a bot for each team.
        // Make sure we connect only once for each team
        var bots = {};
        controller.storage.teams.all(function (err, teams) {
          if (err) {
            throw err;
          }

          teams.map(function (_ref) {
            var token = _ref.token;

            controller.spawn({ token: token }).startRTM();
          });
        });

        controller.on('create_bot', function (bot, config) {
          if (bots[bot.config.token]) {
            // already online
            return;
          }

          bot.startRTM(function (err) {
            if (!err) {
              trackBot(bot);
            }

            // Send a message to person who added the bot
            bot.startPrivateConversation({ user: config.createdBy }, function (err, convo) {
              if (err) {
                console.log(err);
                return;
              }
              convo.say('I am a bot that has just joined your team');
              convo.say('You must now /invite me to a channel so that I can be of use!');
            });
          });
        });
      })();
    } else if (platform === 'facebook') {
      var bot = controller.spawn({});
      controller.createWebhookEndpoints(controller.webserver, bot, function () {
        return console.log('fb bot started');
      });
      controller.on('facebook_optin', function (bot, message) {
        bot.reply(message, 'Hey! I\'m a bot');
      });
    }
  });

  controller.hears('hello', messageEvents, function (bot, message) {
    return bot.reply(message, 'Hello!');
  });

  controller.hears(['evaluate', 'eval', 'run', 'compile', '^```(.+)'], messageEvents, function (bot, message) {
    return (0, _messageHandlers.handleEval)(bot, message, serverOptions.replitApiKey);
  });

  controller.hears(['langs', 'languages', 'supported languages'], messageEvents, _messageHandlers.handleLanguages);
}