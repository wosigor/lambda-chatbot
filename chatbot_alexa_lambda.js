'use strict';

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Please tell me what message to send';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Please tell me what message to send, by saying my message is...';
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Conversation ended. Have a nice day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function createMessageAttributes(messageToSend) {
    return {
        messageToSend,
    };
}

/**
 * Sets the message in the session and prepares the speech to reply to the user.
 */
function setMessageInSession(intent, session, callback) {
    const cardTitle = intent.name;
    const messageToSendSlot = intent.slots.Message;
    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';

    if (messageToSendSlot) {
        const messageToSend = messageToSendSlot.value;
        sessionAttributes = createMessageAttributes(messageToSend);
        // speechOutput = `Your message is ${messageToSend}. Send message by saying confirm`;
        speechOutput = `To send ${messageToSend}, say confirm.`;
        repromptText = `Confirm sending ${messageToSend}`;
    } else {
        speechOutput = "I'm not sure what your message is. Please try again.";
        repromptText = "I'm not sure what your message is. You can tell me your " +
            'message by saying, my message is.';
    }

    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getMessageFromSession(intent, session, callback) {
    let messageToSend;
    const repromptText = null;
    const sessionAttributes = {};
    let shouldEndSession = false;
    let speechOutput = '';

    if (session.attributes) {
        messageToSend = session.attributes.messageToSend;
    }

    if (messageToSend) {
        speechOutput = `Your message ${messageToSend} is sent.`;
        // shouldEndSession = true;
    } else {
        speechOutput = "I'm not sure what your message is.'";
    }
    var response = '';
    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    sendToServer(messageToSend, function(response){
        if (response) {
            speechOutput = `Response is ${response}`;
        } else {
            let answers =["Sorry mum. Busy now, will call you later!",
            "In a meeting now. Will speak to you afterwards",
            "Just playing some footie with friends. Chat later",
            "Didn't quite hear that. What was that?",
            "Shopping for office secret santa present. Any recommendations?",
            "I'm with my girlfriend now. Busy busy. Wink wink"];
            let random = Math.floor(Math.random()*9999 + 1)
            speechOutput = answers[Math.floor(Math.random()*5)]
        }
        callback(sessionAttributes,
            buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
        
         
    });
}


// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
    var response = '';
    sendToServer("call me tomorrow?", function(response){
      console.log('RES:' + response); 
    });
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'MyMessageIsIntent') {
        setMessageInSession(intent, session, callback);
    } else if (intentName === 'WhatsMyMessageIntent') {
        getMessageFromSession(intent, session, callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}

function sendToServer(message, callback) {
    var http = require("http");
    var options = {
    
      hostname: 'dontworrymum.launchminions.com',
      port: 4000,
      path: '/bot/4e3c17b344622b87ae7d9a73e9bd0bb2',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      json: JSON.stringify({ "chatId": "chat14945", "question": message })
    };
    var req = http.request(options, function(res) {
      console.log('Status: ' + res.statusCode);
      console.log('Headers: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (body) {
        let parsedResponse = JSON.parse(body);
        console.log('Answer: ' + parsedResponse['answer']);
        let response = parsedResponse['answer'];
        return callback(response);
      });
    });
    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
        let response = 'His phone is not working. Try again later.';
    });
    // write data to request body
    req.write(JSON.stringify({chatId: "chat14945", question: message}));
    req.end();
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
