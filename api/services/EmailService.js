/**
 * Implementation for Email Service
 * It built for Mailgun.com
 *
 * TODO Tests for production. Stub functions?
 */

const Mailgun = require('mailgun-js');
const fromString = sails.config.mail.from;

let mailgun = Mailgun({
	apiKey: sails.config.mail.api_key,
	domain: sails.config.mail.domain
});

module.exports = {

	sendWelcome(email) {
		this._send(email, 'Welcome!', 'You have been successfully registered');
	},

	sendResetToken(email, resetToken) {
		this._send(email, 'Password reset', 'Your reset token: ' + resetToken);
	},


	_send(email, subject, text) {
		const sendData = {
			from: fromString,
			to: email,
			subject,
			text
		};

		mailgun
			.messages()
			.send(sendData, (error) => {
				/* istanbul ignore next */
				if (error) console.error(error);
			});
	}
};
