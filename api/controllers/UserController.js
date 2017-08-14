/**
 * UserController
 *
 * @description :: Server-side logic for managing Users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const API_ERRORS = require('../constants/APIErrors');
const validator = require('validator');

module.exports = {
	index: function (req, res) {

		// We use here req.userInfo which is set in policies/jwtAuth.js
		res.ok({
			id: req.userInfo.id,
			email: req.userInfo.email
		});
	},

	create: function (req, res) {
		const email = req.body.email;
		const password = req.body.password;
		const passwordConfirm = req.body.password_confirm;

		if (!email || !validator.isEmail(email)) {
			return res.badRequest(Utils.jsonErr('Invalid email'));
		}

		if (password !== passwordConfirm) {
			// TODO Password min requirements
			return res.badRequest(Utils.jsonErr('Password does not match'));
		}

		UserManager
			.createUser({
				email,
				password
			})
			.then(jwToken => {
				res.created({
					token: jwToken
				});
			})
			.catch(err => {
				if (err === API_ERRORS.EMAIL_IN_USE) {
					return res.badRequest(Utils.jsonErr('This email is already in use'));
				}
				return res.serverError(Utils.jsonErr(err));
			});
	},


	login: function (req, res) {
		const email = req.body.email;
		const password = req.body.password;

		if (!email || !validator.isEmail(email)) {
			return res.badRequest(Utils.jsonErr('Invalid email'));
		}

		//TODO what if there is no password here?

		UserManager.authenticateUserByPassword(email, password)
			.then(token => {
				res.ok({token});
			})
			.catch(err => {
				switch (err) {
					case API_ERRORS.INVALID_EMAIL_PASSWORD:
					case API_ERRORS.USER_NOT_FOUND:
						return res.badRequest(Utils.jsonErr('Invalid email or password'));
						break;
					case API_ERRORS.USER_LOCKED:
						return res.forbidden(Utils.jsonErr('Account locked'));
					default:
						return res.serverError(Utils.jsonErr(err));
				}
			});
	},

	forgotPassword: function (req, res) {
		const email = req.body.email;

		if (!email || !validator.isEmail(email)) {
			return res.badRequest(Utils.jsonErr('Invalid email'));
		}

		UserManager
			.generateResetToken(email)
			.then(function () {
				res.ok({message: 'Check your email'});
			})
			.catch(err => {
				if (err === API_ERRORS.USER_NOT_FOUND) {
					return res.notFound(Utils.jsonErr('User not found'));
				}
				return res.serverError(Utils.jsonErr(err));
			})
	},

	changePassword: function (req, res) {
		const email = req.body.email;
		const oldPassword = req.body.password;
		const newPassword = req.body.new_password;
		const newPasswordConfirm = req.body.new_password_confirm;


		if (!email || !validator.isEmail(email)) {
			return res.badRequest(Utils.jsonErr('Invalid email'));
		}

		if (!oldPassword) {
			return res.badRequest(Utils.jsonErr('Current password is required'));
		}

		if (!newPassword || newPassword !== newPasswordConfirm) {
			return res.badRequest(Utils.jsonErr('Password does not match'));
		}

		UserManager
			.changePassword(email, oldPassword, newPassword)
			.then(function (token) {
				return res.ok({token});
			})
			.catch(err => {
				switch (err) {
					case API_ERRORS.USER_NOT_FOUND:
						return res.badRequest(Utils.jsonErr('Email not found'));
					case API_ERRORS.USER_LOCKED:
						return res.forbidden(Utils.jsonErr('Email locked')); // TODO Test
					case API_ERRORS.INVALID_PASSWORD:
						return res.badRequest(Utils.jsonErr('Invalid password'));
					default:
						return res.serverError(Utils.jsonErr(err));
				}
			});
	},

	resetPasswordByResetToken: function (req, res) {
		const email = req.body.email;
		const resetToken = req.body.reset_token;
		const newPassword = req.body.new_password;
		const newPasswordConfirm = req.body.new_password_confirm;

		if (!email || !validator.isEmail(email)) {
			return res.badRequest(Utils.jsonErr('Invalid email')); // TODO test
		}

		if (!resetToken) {
			return res.badRequest(Utils.jsonErr('Reset token is required')); //TODO test
		}

		if (!newPassword || newPassword !== newPasswordConfirm) {
			return res.badRequest(Utils.jsonErr('Password does not match')); //TODO test
		}

		UserManager
			.resetPasswordByResetToken(email, resetToken, newPassword)
			.then(() => {
				res.ok({message: 'Done'});
			})
			.catch(err => {
				if (err === API_ERRORS.USER_NOT_FOUND) {
					// We show invalid email instead of User Not Found
					return res.badRequest(Utils.jsonErr('Invalid email'));
				}
				return res.serverError(Utils.jsonErr(err));
			})
	},
};

