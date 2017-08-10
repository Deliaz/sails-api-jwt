/**
 * JSON Web Token
 *
 * @description :: JSON Webtoken Service for sails
 * @help        :: See https://github.com/auth0/node-jsonwebtoken & http://sailsjs.org/#!/documentation/concepts/Services
 */

const jwt = require('jsonwebtoken');
const tokenSecret = "SECRET123"; // TODO Change

/**
 * Generates a token from supplied payload
 * @param payload
 * @returns {number}
 */
module.exports.issue = function (payload) {
	return jwt.sign(
		payload,
		tokenSecret, 				// Token Secret that we sign it with
		{
			expiresIn: '24h'		// 24 hours
		}
	);
};

/**
 * Verifies token on a request
 * @param token
 * @param callback
 */
module.exports.verify = function (token, callback) {
	return jwt.verify(
		token, 						// The token to be verified
		tokenSecret, 				// Same token we used to sign
		{}, 						// No Option, for more see https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback
		callback 					//Pass errors or decoded token to callback
	);
};
