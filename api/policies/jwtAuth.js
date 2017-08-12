/**
 * JWT Auth Policy
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
			return res.json(401, {err: 'Format is "Authorization: Bearer [token]"'});
		}
	} else {
		return res.json(401, {err: 'No Authorization header was found'});
	}


	UserManager.authenticateUserByToken(token, function (err, user) {
		if (err) {
			return res.json(401, {err: 'Invalid token'});
		}

		if (!user) return res.json(404, {err: 'User not found'});
		req.userInfo = {
			id: user.id,
			email: user.email
		};
		next();
	});

};

