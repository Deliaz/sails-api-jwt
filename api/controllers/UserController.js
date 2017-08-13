/**
 * UserController
 *
 * @description :: Server-side logic for managing Users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

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

		if (password !== passwordConfirm) {
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
				if (!err) {
					return res.badRequest(Utils.jsonErr('This email is already in use'));
				}
				return res.serverError(Utils.jsonErr(err));
			});
	},


	login: function (req, res) {
		const email = req.body.email;
		const password = req.body.password;

		UserManager.authenticateUserByPassword(email, password)
			.then(token => {
				res.ok({token});
			})
			.catch(err => {
				if (!err) return res.badRequest(Utils.jsonErr('Invalid email or password'));
				if (err === 'locked') {
					return res.forbidden(Utils.jsonErr('Account locked'));
				}
				res.serverError(Utils.jsonErr(err));
			})
	},

	forgotPassword: function (req, res) {
		const email = req.body.email;

		if (!email) {
			return res.badRequest(Utils.jsonErr('Email is required'));
		}

		UserManager
			.generateResetToken(email)
			.then(function () {
				res.ok({message: 'Check your email'});
			})
			.catch(err => {
				if (!err) return res.notFound(Utils.jsonErr('User not found'));
				res.serverError(Utils.jsonErr(err));
			})
	},

	changePassword: function (req, res) {
		const email = req.body.email;
		const oldPassword = req.body.password;
		const newPassword = req.body.new_password;
		const newPasswordConfirm = req.body.new_password_confirm;


		if (!email) {
			return res.badRequest(Utils.jsonErr('Email is required'));
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
				if (!err) return res.badRequest(Utils.jsonErr('Invalid email')); // Requested user not found
				if (err === 'invalid_pass') return res.badRequest(Utils.jsonErr('Invalid password'));
				res.serverError(Utils.jsonErr(err));
			});
	},

	resetPasswordByResetToken: function (req, res) {
		const email = req.body.email;
		const resetToken = req.body.reset_token;
		const newPassword = req.body.new_password;
		const newPasswordConfirm = req.body.new_password_confirm;

		if (!email) {
			return res.badRequest(Utils.jsonErr('Email is required')); //TODO test
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
				if (!err) return res.badRequest(Utils.jsonErr('Invalid email'));
				console.log('Error: ', err);
				res.json(500);
			})
	},
};

