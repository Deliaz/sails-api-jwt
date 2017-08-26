/**
 * User.js
 *
 * @description :: User model
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

		/**
		 * Validates user password with stored password hash
		 * @param password
		 * @returns {Promise}
		 */
		validatePassword: function (password) {
			return bcrypt.compare(password, this.toObject().encryptedPassword);

		},


		/**
		 * Set user password
		 * @param password
		 * @returns {Promise}
		 */
		setPassword: function (password) {
			return generatePasswordHash(password)
				.then(hash => {
					this.encryptedPassword = hash;
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
				/* istanbul ignore next */
				next(err);
			});
	}
};

