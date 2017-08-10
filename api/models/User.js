/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

const bcrypt = require('bcrypt');

module.exports = {

	attributes: {
		username: {
			type: 'string',
			required: true,
			unique: true
		},

		email: {
			type: 'email',
			required: true,
			unique: true
		},

		password: {
			type: 'string',
			required: true
		},

		salt: {
			type: 'string'
		},

		locked: {
			type: 'boolean',
			defaultsTo: false
		},

		passwordFailures: {
			type: 'integer',
			defaultsTo: 0
		},

		lastPasswordFailure: {
			type: 'datetime'
		},

		resetToken: {
			type: 'string'
		},

		toJSON: function () {
			const obj = this.toObject();

			return {
				id: obj.id,
				username: obj.username
			};
		},

		validatePassword: function (password, done) {
			// if (!password || password.length === 0) {
			// 	return done(null, false);
			// }
			//
			// var obj = this.toObject();
			//
			// UserManager.hashPassword(password, obj.salt, function (err, hashedPassword) {
			// 	if (err) return done(err);
			//
			// 	done(null, hashedPassword === obj.password);
			// });
		}
	},

	/**
	 * Encrypt password before creating a User
	 * @param values
	 * @param next
	 */
	beforeCreate: function (values, next) {
		bcrypt.genSalt(10)
			.then((salt) => {
				return bcrypt.hash(values.password, salt);
			})
			.then(hash => {
				values.encryptedPassword = hash;
				next();
			})
			.catch(err => {
				next(err);
			});
	},


	/**
	 * Compare auth password with stored password
	 * @param password
	 * @param user
	 * @param cb
	 */
	comparePassword: function (password, user, cb) {
		bcrypt
			.compare(password, user.encryptedPassword)
			.then(match => {
				if (match) {
					cb(null, true);
				} else {
					cb(err);
				}
			})
			.catch(err => cb(err))
	}


};

