/**
 * Implementation for Email Service
 * It uses mailgun.com
 */

const api_key = 'key-XXXXXXXXXXXXXXXXXXXXXXX';
const domain = 'www.mydomain.com';
const mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

const data = {
	from: 'Excited User <me@samples.mailgun.org>',
	to: 'serobnic@mail.ru',
	subject: 'Hello',
	text: 'Testing some Mailgun awesomness!'
};

mailgun.messages().send(data, function (error, body) {
	console.log(body);
});
