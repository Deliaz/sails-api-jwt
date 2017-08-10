/**
 * JWT Policy
 *
 * @module      :: Policy
 * @description :: Simple policy to allow any authenticated user via JWT token
 * @docs        :: http://sailsjs.org/#!/documentation/concepts/Policies
 *
 */

module.exports = function (req, res, next) {
	let token;

	if (req.headers && req.headers.authorization) {
		const parts = req.headers.authorization.split(' ');
		if (parts.length === 2) {
			const scheme = parts[0],
				credentials = parts[1];

			if (/^Bearer$/i.test(scheme)) {
				token = credentials;
			}
		} else {
			return res.json(401, {err: 'Format is Authorization: Bearer [token]'});
		}
	} else if (req.param('token')) {
		token = req.param('token');
		// We delete the token from param to not mess with blueprints
		delete req.query.token;
	} else {
		return res.json(401, {err: 'No Authorization header was found'});
	}

	jwt.verify(token, function (err, token) {
		if (err) return res.json(401, {err: 'Invalid Token!'});
		req.token = token; // This is the decrypted token or the payload you provided
		next();
	});
};

