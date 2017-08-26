const jwt = require('jsonwebtoken');
const shortid = require('shortid');
const moment = require('moment');
const farmhash = require('farmhash');

const API_ERRORS = require('../constants/APIErrors');

const LOCK_INTERVAL_SEC = 120;
const LOCK_TRY_COUNT = 5;

function doesUsernameExist(email) {
	return new Promise((resolve, reject) => {
		User
			.findOne({email: email})
			.exec((err, user) => {
				if (err) return reject(err);
				return resolve(!!user);
			});
	});
}

function updateUserLockState(user, done) {
	const now = moment().utc();

	let prevFailure = null;
	if (user.lastPasswordFailure) {
		prevFailure = moment(user.lastPasswordFailure);
	}

	if (prevFailure !== null && now.diff(prevFailure, 'seconds') < LOCK_INTERVAL_SEC) {
		user.passwordFailures += 1;

		// lock if this is the 4th incorrect attempt
		if (user.passwordFailures >= LOCK_TRY_COUNT) {
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

	/**
	 * Creates a new user
	 * @param values
	 * @returns {Promise}
	 */
	createUser: (values) => {
		const email = values.email;

		return new Promise((resolve, reject) => {
			doesUsernameExist(email)
				.then(exists => {
					if (exists) {
						return reject(API_ERRORS.EMAIL_IN_USE);
					}

					User.create(values).exec((createErr, user) => {
						if (createErr) return reject(createErr);

						UserManager._generateUserToken(user, token => {
							resolve(token);
							EmailService.sendWelcome(email);
						});
					});
				})
				.catch(reject);
		});
	},


	/**
	 * Generates JWT token
	 * TODO Promisify
	 * @param user
	 * @param done
	 * @returns {*}
	 * @private
	 */
	_generateUserToken: function (user, done) {

		// Password hash helps to invalidate token when password is changed
		const passwordHash = farmhash.hash32(user.encryptedPassword);

		const payload = {
			id: user.id,
			pwh: passwordHash
		};

		const token = jwt.sign(
			payload,
			sails.config.jwt_secret,
			{
				expiresIn: '24h'	// 24 hours
			}
		);
		return done(token);
	},


	/**
	 * Authenticates user by a JWT token.
	 *
	 * Uses in JWT Policy
	 * @see api/policies/jwtAuth.js
	 *
	 * @param token
	 * @returns {Promise}
	 */
	authenticateUserByToken: function (token) {
		return new Promise((resolve, reject) => {
			jwt.verify(token, sails.config.jwt_secret, {}, (err, tokenData) => {
				if (err) return reject(err); // JWT parse error

				User
					.findOne({id: tokenData.id})
					.exec((err, user) => {
						if (err) return reject(err); // Query error
						if (!user) return reject(API_ERRORS.USER_NOT_FOUND);
						if (user.locked) return reject(API_ERRORS.USER_LOCKED);

						const passwordHash = farmhash.hash32(user.encryptedPassword);
						if (tokenData.pwh !== passwordHash) { // Old token, built with inactive password
							return reject(API_ERRORS.INACTIVE_TOKEN);
						}
						return resolve(user);
					});
			});
		});
	},


	/**
	 * Validates user password
	 * @param email
	 * @param password
	 * @returns {Promise}
	 */
	validatePassword(email, password) {
		return new Promise((resolve, reject) => {
			User
				.findOne({email: email})
				.exec((err, user) => {
					if (err) return reject(err);
					if (!user) return reject(API_ERRORS.USER_NOT_FOUND);
					if (user.locked) return reject(API_ERRORS.USER_LOCKED);

					user
						.validatePassword(password)
						.then(isValid => {
							resolve({isValid, user});
						})
						.catch(reject);
				});
		});
	},


	/**
	 * Authenticates user by email and password.
	 * @param email
	 * @param password
	 * @returns {Promise}
	 */
	authenticateUserByPassword: function (email, password) {
		return new Promise((resolve, reject) => {
			UserManager
				.validatePassword(email, password)
				.then(({isValid, user}) => {
					if (!isValid) {
						updateUserLockState(user, saveErr => {
							if (saveErr) return reject(saveErr);
						});
						return reject(API_ERRORS.INVALID_EMAIL_PASSWORD);
					}
					else {
						UserManager._generateUserToken(user, token => {
							resolve(token);
						});
					}
				})
				.catch(reject);
		});
	},


	/**
	 * Generates password reset token
	 * @param email
	 * @returns {Promise}
	 */
	generateResetToken: function (email) {
		return new Promise((resolve, reject) => {
			User
				.findOne({email})
				.exec((err, user) => {
					if (err) return reject(err); // Query error
					if (!user) return reject(API_ERRORS.USER_NOT_FOUND);

					const resetToken = shortid.generate();
					user.resetToken = resetToken;
					user.save(saveErr => {
						if (saveErr) return reject(saveErr);

						EmailService.sendResetToken(email, resetToken);
						resolve();
					});
				});
		});
	},


	/**
	 * Changes password
	 * @param email
	 * @param currentPassword
	 * @param newPassword
	 * @returns {Promise}
	 */
	changePassword: function (email, currentPassword, newPassword) {
		return new Promise((resolve, reject) => {
			UserManager
				.validatePassword(email, currentPassword)
				.then(({isValid, user}) => {
					if (!isValid) {
						return reject(API_ERRORS.INVALID_PASSWORD);
					}
					else {
						user
							.setPassword(newPassword)
							.then(() => {
								user.resetToken = null;
								user.passwordFailures = 0;
								user.lastPasswordFailure = null;
								user.save();

								UserManager._generateUserToken(user, token => {
									resolve(token);
								});
							})
							.catch(reject);
					}
				})
				.catch(reject);
		});
	},


	/**
	 * Resets password to a new one by reset token.
	 * @param email
	 * @param resetToken
	 * @param newPassword
	 * @returns {Promise}
	 */
	resetPasswordByResetToken: function (email, resetToken, newPassword) {
		return new Promise((resolve, reject) => {
			User
				.findOne({email, resetToken})
				.exec((err, user) => {
					if (err) return reject(err); // Query error
					if (!user) return reject(API_ERRORS.USER_NOT_FOUND);

					// TODO Check reset token validity

					user
						.setPassword(newPassword)
						.then(() => {
							user.resetToken = null;
							user.passwordFailures = 0;
							user.lastPasswordFailure = null;
							user.save();

							resolve();
						})
						.catch(reject);
				});
		});
	}
};
