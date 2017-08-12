/**
 * UserController
 *
 * @description :: Server-side logic for managing Users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */



module.exports = {
	index: function (req, res) {
		res.json(200, {
			id: req.userInfo.id // It is set in policies/jwtAuth.js
		});
	},

	create: function (req, res) {
		const email = req.body.email;
		const password = req.body.password;
		const passwordConfirm = req.body.password_confirm;

		if (password !== passwordConfirm) {
			return res.json(200, {err: 'Password doesn\'t match'});
		}

		UserManager
			.createUser({
				email,
				password
			})
			.then(jwToken => {
				res.json(200, {
					token: jwToken
				})
			})
			.catch(err => {
				if (!err) {
					return res.send(200, {err: 'This username is already in use'});
				}
				console.error(err);
				return res.send(500); // TODO
			});
	},


	login: function (req, res) {
		const email = req.body.email;
		const password = req.body.password;
		const passwordConfirm = req.body.password_confirm;

		if (password !== passwordConfirm) {
			return res.json(200, {err: 'Password doesn\'t match'});
		}

		UserManager.authenticateUserByPassword(email, password)
			.then(token => {
				res.json(200, {token});
			})
			.catch(err => {
				if (!err) return res.json(401, {err: 'User not found'});
				console.log('Error: ', err);
				res.json(500);
			})
	},

	forgotPassword: function (req, res) {
		const email = req.body.email;

		if (!email) {
			return res.json(200, {err: 'Email is required'});
		}

		UserManager
			.generateResetToken(email)
			.then(function () {
				res.send(200, {message: 'Check your email'});
			})
			.catch(err => {
				if (!err) return res.json(401, {err: 'User not found'});
				console.log('Error: ', err);
				res.json(500);
			})
	},

	changePassword: function (req, res) {
		const email = req.body.email;
		const oldPassword = req.body.password;
		const newPassword = req.body.new_password;
		const newPasswordConfirm = req.body.new_password_confirm;


		if (!email) {
			return res.json(200, {err: 'Email is required'});
		}

		if (!oldPassword) {
			return res.json(200, {err: 'Current password is required'});
		}

		if (!newPassword || newPassword !== newPasswordConfirm) {
			return res.json(200, {err: 'Password does not match'});
		}

		UserManager
			.changePassword(email, oldPassword, newPassword)
			.then(function (token) {
				return res.send(200, {token: token});
			})
			.catch(err => {
				if (!err) return res.json(401, {err: 'User not found'});
				console.log('Error: ', err);
				res.json(500);
			});
	},

	resetPasswordByResetToken: function (req, res) {
		const email = req.body.email;
		const resetToken = req.body.reset_token;
		const newPassword = req.body.new_password;
		const newPasswordConfirm = req.body.new_password_confirm;

		if (!email) {
			return res.json(200, {err: 'Email is required'});
		}

		if (!resetToken) {
			return res.json(200, {err: 'Reset token is required'});
		}

		if (!newPassword || newPassword !== newPasswordConfirm) {
			return res.json(200, {err: 'Password doesn\'t match'});
		}

		UserManager
			.resetPasswordByResetToken(email, resetToken, newPassword)
			.then(() => {
				res.send(200, {message: 'Done'});
			})
			.catch(err => {
				if (!err) return res.json(401, {err: 'User not found'});
				console.log('Error: ', err);
				res.json(500);
			})
	},
};

