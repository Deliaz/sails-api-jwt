const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const shortid = require('shortid');
const moment = require('moment');
const farmhash = require('farmhash');

// TODO Config
const JWT_SECRET = 'SECRET123';
const LOCK_INTERVAL_SEC = 120;
const LOCK_TRY_COUNT = 5;

function doesUsernameExist(email, done) {
	User
		.findOne({email: email})
		.exec((err, user) => {
			if (err) return done(err);
			return done(null, !!user);
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
		if (user.passwordFailures >= LOCK_TRY_COUNT) { // TODO config
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
			doesUsernameExist(values.email, (err, exists) => {
				if (err) {
					return reject(err);
				}

				if (exists) {
					// todo: a better return result
					return reject();
				}

				User.create(values).exec((createErr, user) => {
					if (createErr) return reject(createErr);

					UserManager._generateUserToken(user, token => {
						// todo: send welcome email
						resolve(token);
					});
				});
			});
		});
	},

	_generateUserToken: function (user, done) {

		// Password hash helps to invalidate token when password is changed
		const passwordHash = farmhash.hash32(user.encryptedPassword);

		const payload = {
			id: user.id,
			pwh: passwordHash
		};

		const token = jwt.sign(
			payload,
			JWT_SECRET,
			{
				expiresIn: '24h'	// 24 hours
			}
		);
		return done(token);
	},


	// TODO promisify
	/**
	 *
	 * @param token
	 * @param done
	 */
	authenticateUserByToken: function (token, done) {
		jwt.verify(
			token,
			JWT_SECRET,
			{},
			(err, tokenData) => {
				if (err) return done(err);

				User
					.findOne({id: tokenData.id})
					.exec((err, user) => {
						if (err) return done(err);
						if (!user) return done(null, null);
						if (user.locked) return done('locked');

						const passwordHash = farmhash.hash32(user.encryptedPassword);
						if (tokenData.pwh !== passwordHash) { // Old token
							return done(err);
						}
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
					if (!user) return reject();
					if (user.locked) return reject('locked');

					user.validatePassword(password, (vpErr, isValid) => {
						if (vpErr) return reject(vpErr);

						if (!isValid) {
							updateUserLockState(user, (err) => {
								if (err) return reject(err);
								return reject();
							});

							return reject(false);
						}
						else {
							UserManager._generateUserToken(user, token => {
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
				.exec((err, user) => {
					if (err) return reject(err);
					if (!user) return reject();

					user.resetToken = shortid.generate();
					user.save(saveErr => {
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
					if (!user) return reject();
					if (user.locked) return reject('locked');

					user.validatePassword(oldPassword, (vpErr, isValid) => {
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

								UserManager._generateUserToken(user, token => {
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
