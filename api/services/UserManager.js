const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const shortid = require('shortid');
const moment = require('moment');


// this would need to live in sails config
const jwtSecret = 'SECRET123';

function doesUsernameExist(email, done) {
	User
		.findOne({email: email})
		.exec(function (err, user) {
			if (err) return done(err);
			return done(null, !!user);
		});
}

function updateUserLockState(user, done) {
	const now = moment().utc();
	let lastFailure = null;

	if (user.lastPasswordFailure) {
		lastFailure = moment(user.lastPasswordFailure);
	}

	if (lastFailure !== null && now.diff(lastFailure, 'seconds') < 1800) {
		user.passwordFailures += 1;

		// lock if this is the 4th incorrect attempt
		if (user.passwordFailures > 3) { // TODO config
			user.locked = true;
		}
	}
	else {
		// reset the failed attempts
		user.passwordFailures = 1;
	}

	user.lastPasswordFailure = now.toDate();

	user.save(done);
}

module.exports = {
	createUser: (values) => {
		return new Promise((resolve, reject) => {
			doesUsernameExist(values.email, function (err, exists) {
				if (err) {
					return reject(err);
				}

				if (exists) {
					// todo: a better return result
					return reject();
				}

				User.create(values).exec(function (createErr, user) {
					if (createErr) return reject(createErr);

					UserManager._generateUserToken({
						id: user.id,
					}, token => {
						// todo: send welcome email
						resolve(token);
					});
				});
			});
		});
	},

	_generateUserToken: function (payload, done) {
		const token = jwt.sign(
			payload,
			jwtSecret,
			{
				expiresIn: '24h'	// 24 hours
			}
		);
		return done(token);
	},


	// TODO promisify
	authenticateUserByToken: function (token, done) {
		jwt.verify(
			token,
			jwtSecret,
			{},
			(err, tokenData) => {
				if (err) return done(err);

				// TODO Check if user not locked
				User
					.findOne({id: tokenData.id})
					.exec(function (err, user) {
						if (err) return done(err);
						return done(null, user);
					});
			}
		);


	},

	authenticateUserByPassword: function (email, password) {
		return new Promise((resolve, reject) => {
			User
				.findOne({email: email})
				.exec((err, user) => {
					if (err) return reject(err);
					if (!user || user.locked) return reject();

					user.validatePassword(password, function (vpErr, isValid) {
						if (vpErr) return reject(vpErr);

						if (!isValid) {
							return reject(false);

							// TODO write a lock logic
							// updateUserLockState(user, function (err) {
							// 	if (err) return reject(err);
							// 	return reject();
							// });
						}
						else {
							UserManager._generateUserToken({
								id: user.id,
							}, token => {
								resolve(token);
							});
						}
					});
				});
		});
	},

	generateResetToken: function (email) {
		return new Promise((resolve, reject) => {
			User
				.findOne({email})
				.exec(function (err, user) {
					if (err) return reject(err);
					if (!user) return reject();

					user.resetToken = shortid.generate();
					user.save(function (saveErr) {
						if (saveErr) return reject(saveErr);

						// TODO: email the token to the user
						// console.log('Reset Token', user.resetToken);

						resolve();
					});
				});
		});
	},

	changePassword: function (email, oldPassword, newPassword) {
		return new Promise((resolve, reject) => {

			// TODO almost same as in authenticateUserByPassword
			User
				.findOne({email: email})
				.exec((err, user) => {
					if (err) return reject(err);
					if (!user || user.locked) return reject();

					user.validatePassword(oldPassword, function (vpErr, isValid) {
						if (vpErr) return reject(vpErr);

						if (!isValid) {
							return reject('invalid_pass');
						}
						else {

							user.setPassword(newPassword, err => {
								if (err) return reject(err);

								user.resetToken = null;
								user.passwordFailures = 0;
								user.lastPasswordFailure = null;
								user.save();

								UserManager._generateUserToken({
									id: user.id,
								}, token => {
									resolve(token);
								});
							});
						}
					});
				});
		});
	},

	resetPasswordByResetToken: function (email, resetToken, newPassword) {
		return new Promise((resolve, reject) => {
			User
				.findOne({email, resetToken})
				.exec((err, user) => {
					if (err) return reject(err);
					if (!user) return reject();

					user.setPassword(newPassword, err => {
						if (err) return reject(err);

						user.resetToken = null;
						user.passwordFailures = 0;
						user.lastPasswordFailure = null;
						user.save();

						resolve();
					});
				});
		});
	}
};
