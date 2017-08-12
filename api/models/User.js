/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

const bcrypt = require('bcrypt');


function generatePasswordHash(password) {
	return bcrypt.genSalt(10) // 10 is default
		.then((salt) => {
			return bcrypt.hash(password, salt);
		})
		.then(hash => {
			return Promise.resolve(hash);
		})
		.catch(err => {
			return Promise.reject(err)
		});
}

module.exports = {

	attributes: {
		email: {
			type: 'email',
			required: true,
			unique: true
		},

		role: {
			type: 'string',
			defaultsTo: 'user'
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
				email: obj.email
			};
		},

		validatePassword: function (password, done) {
			bcrypt
				.compare(password, this.toObject().encryptedPassword)
				.then(match => {
					done(null, !!match);
				})
				.catch(err => done(err))
		},

		setPassword: function (password, done) {
			generatePasswordHash(password)
				.then(hash => {
					this.encryptedPassword = hash;
					done();
				})
				.catch(err => {
					done(err);
				});
		}
	},

	/**
	 * Encrypt password before creating a User
	 * @param values
	 * @param next
	 */
	beforeCreate: function (values, next) {
		generatePasswordHash(values.password)
			.then(hash => {
				delete(values.password);
				values.encryptedPassword = hash;
				next();
			})
			.catch(err => {
				next(err);
			});
	}

};

