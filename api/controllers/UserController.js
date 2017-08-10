/**
 * UserController
 *
 * @description :: Server-side logic for managing Users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */



module.exports = {
	create: function (req, res) {
		if (req.body.password !== req.body.confirmPassword) {
			return res.json(200, {err: 'Password doesn\'t match'});
		}
		User.create(req.body).exec(function (err, user) {
			if (err) {
				return res.json(err.status, {err: err});
			}
			// If user created successfully we return user and token as response
			if (user) {
				// NOTE: payload is { id: user.id}
				res.json(200, {user: user, token: jwt.issue({id: user.id})});
			}
		});
	},

	index: function (req, res) {

		console.log(req.token);
	}
};

