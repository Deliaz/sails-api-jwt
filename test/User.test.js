// Defining ESLint environments
/* eslint-env node, mocha */

const sails = require('sails');
const chai = require('chai');
chai.should();
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const mock = require('mock-require');

mock('mailgun-js', function () {
	return {
		messages: () => {
			return {
				send: function (sendData) {
					console.log(`EMAIL. ${JSON.stringify(sendData)}`);
				}
			};
		}
	};
});

chai.use(chaiHttp);
chai.use(sinonChai);

const API = 'http://localhost:1337/user';

// Start sails app
before(function (done) {
	// Increase the Mocha timeout so that Sails has enough time to lift.
	this.timeout(5000);
	sails.lift({
		log: {
			level: 'silent'
		}
	}, function (err) {
		if (err) return done(err);
		done(err, sails);
	});
});

// Stop sails app
after(function (done) {
	sails.lower(done);
});

function checkHeaders(res, statusCode) {
	res.should.have.status(statusCode);
	res.should.have.header('content-type', 'application/json; charset=utf-8');
}


describe('User API', () => {
	let token;
	let newToken;

	describe('Creating and auth', () => {

		it('should return auth error for /index', done => {
			chai.request(API)
				.get('/index')
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.a('string');
					done();
				});
		});

		it('should not create a user without email', done => {
			chai.request(API)
				.post('/create')
				.send({
					password: 'abc123',
					password_confirm: 'abc123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Invalid email');
					done();
				});
		});


		it('should not create with invalid password', done => {
			chai.request(API)
				.post('/create')
				.send({
					email: 'a@gmail.com',
					password: '123',
					password_confirm: '123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Password must be 6-24 characters, including letters and digits');
					done();
				});
		});


		it('should not create with bad password confirm', done => {
			chai.request(API)
				.post('/create')
				.send({
					email: 'a@gmail.com',
					password: 'aaa123',
					password_confirm: 'bbb123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Password does not match');
					done();
				});
		});

		it('should not create a user with bad email', done => {
			chai.request(API)
				.post('/create')
				.send({
					email: 'aaa---+++@@@',
					password: 'abc123',
					password_confirm: 'abc123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Invalid email');
					done();
				});
		});

		it('should create a new user', done => {
			let spy = sinon.spy(console, 'log');
			chai.request(API)
				.post('/create')
				.send({
					email: 'a@gmail.com',
					password: 'abc123',
					password_confirm: 'abc123'
				})
				.end((err, res) => {
					checkHeaders(res, 201);

					res.body.token.should.be.a('string');

					spy.should.have.been.calledWithMatch(/(.+a@gmail\.com.+You have been successfully registered)/);
					spy.restore();

					token = res.body.token;
					done();
				});
		});

		it('should not create a new user with the same info', done => {
			chai.request(API)
				.post('/create')
				.send({
					email: 'a@gmail.com',
					password: 'abc123',
					password_confirm: 'abc123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.a('string');
					res.body.err_msg.should.be.equal('This email is already in use');
					done();
				});
		});

		it('should not login without password', done => {
			chai.request(API)
				.post('/login')
				.send({
					email: 'a@gmail.com'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Invalid email or password');
					done();
				});
		});

		it('should not login with invalid email', done => {
			chai.request(API)
				.post('/login')
				.send({
					email: 'aaaa+++@@@fff'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Invalid email');
					done();
				});
		});

		it('should login successfully', done => {
			chai.request(API)
				.post('/login')
				.send({
					email: 'a@gmail.com',
					password: 'abc123'
				})
				.end((err, res) => {
					checkHeaders(res, 200);
					res.body.token.should.be.a('string');
					done();
				});
		});

		it('should not login for unknown email', done => {
			chai.request(API)
				.post('/login')
				.send({
					email: 'aaa@gmail.com',
					password: 'abc123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Invalid email or password');
					done();
				});
		});

		it('should not login for unknown email', done => {
			chai.request(API)
				.post('/login')
				.send({
					email: 'a@gmail.com',
					password: '333'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Invalid email or password');
					done();
				});
		});

		it('should return user info object with id', done => {
			chai.request(API)
				.post('/index')
				.set('Authorization', 'Bearer ' + token)
				.end((err, res) => {
					checkHeaders(res, 200);
					res.body.id.should.be.a('number');
					res.body.email.should.be.a('string');
					Object.keys(res.body).length.should.be.equal(2);
					done();
				});
		});

		it('should not return user info for not auth', done => {
			chai.request(API)
				.post('/index')
				.set('Authorization', 'AAA')
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Format is "Authorization: Bearer [token]"');
					done();
				});
		});

		it('should not return user info for bad token format', done => {
			chai.request(API)
				.post('/index')
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('No Authorization header was found');
					done();
				});
		});

		it('should not return user info for invalid token', done => {
			chai.request(API)
				.post('/index')
				.set('Authorization', 'Bearer ' + 'AAA.BBB.CCC')
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Invalid token');
					done();
				});
		});


		it('should return user not found for random but valid token', done => {
			chai.request(API)
				.post('/index')
				.set('Authorization', 'Bearer ' + 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTgsImlhdCI6MTUwMjU1NDA0NywiZXhwIjoxNTAyNjQwNDQ3fQ.E0NrVER_tPfIr5LtOX-LsMgIwlXrYawuGAHEwyxbdNw')
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Invalid token');
					done();
				});
		});
	});


	describe('Password recovery', () => {
		it('should allow to request reset password', done => {
			let spy = sinon.spy(console, 'log');

			chai.request(API)
				.post('/forgot')
				.send({email: 'a@gmail.com'})
				.end((err, res) => {
					checkHeaders(res, 200);
					res.body.message.should.be.equal('Check your email');
					spy.should.have.been.calledWithMatch(/(.+a@gmail\.com.+"Your reset token:\s?[A-z0-9-_]+")/);
					spy.restore();
					done();
				});
		});

		it('should not allow to request reset password for unknown email', done => {
			chai.request(API)
				.post('/forgot')
				.send({email: 'bbb@gmail.com'})
				.end((err, res) => {
					checkHeaders(res, 404);

					res.body.err_msg.should.be.equal('User not found');
					done();
				});
		});

		it('should not allow to request reset password for empty email', done => {
			chai.request(API)
				.post('/forgot')
				.end((err, res) => {
					checkHeaders(res, 400);

					res.body.err_msg.should.be.equal('Invalid email');
					done();
				});
		});


		let resetToken = null;
		it('should read password reset token', () => {
			const fs = require('fs');
			const db = JSON.parse(fs.readFileSync('./.tmp/localDiskDb.db', 'utf-8'));

			db.data.user[0].resetToken.should.be.a('string');
			resetToken = db.data.user[0].resetToken;
		});

		it('should not reset password to invalid password', done => {
			chai.request(API)
				.post('/reset_password')
				.send({
					email: 'a@gmail.com',
					reset_token: resetToken,
					new_password: '111',
					new_password_confirm: '111'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Password must be 6-24 characters, including letters and digits');
					done();
				});
		});

		it('should not reset password with invalid email', done => {
			chai.request(API)
				.post('/reset_password')
				.send({
					email: 'aaa+++@@@@',
					reset_token: resetToken,
					new_password: 'aaa111',
					new_password_confirm: 'aaa111'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Invalid email');
					done();
				});
		});


		it('should not reset password with unknown email', done => {
			chai.request(API)
				.post('/reset_password')
				.send({
					email: 'ccc@gmail.com',
					reset_token: resetToken,
					new_password: 'aaa111',
					new_password_confirm: 'aaa111'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Invalid email');
					done();
				});
		});

		it('should not reset password without reset token', done => {
			chai.request(API)
				.post('/reset_password')
				.send({
					email: 'a@gmail.com',
					new_password: 'aaa111',
					new_password_confirm: 'aaa111'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Reset token is required');
					done();
				});
		});

		it('should not reset password with bad password confirm', done => {
			chai.request(API)
				.post('/reset_password')
				.send({
					email: 'a@gmail.com',
					reset_token: resetToken,
					new_password: 'aaa111',
					new_password_confirm: 'bbb222'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Password does not match');
					done();
				});
		});

		it('should reset password with reset token', done => {
			chai.request(API)
				.post('/reset_password')
				.send({
					email: 'a@gmail.com',
					reset_token: resetToken,
					new_password: 'aaa111',
					new_password_confirm: 'aaa111'
				})
				.end((err, res) => {
					checkHeaders(res, 200);
					res.body.message.should.be.equal('Done');
					done();
				});
		});

		it('should not show user info for old token', done => {
			chai.request(API)
				.get('/index')
				.set('Authorization', 'Bearer ' + token)
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.a('string');
					done();
				});
		});

		it('should login with new password', done => {
			chai.request(API)
				.post('/login')
				.send({
					email: 'a@gmail.com',
					password: 'aaa111'
				})
				.end((err, res) => {
					checkHeaders(res, 200);
					res.body.token.should.be.a('string');

					// Update token after reset
					token = res.body.token;

					done();
				});
		});

		it('should not login with old password', done => {
			chai.request(API)
				.post('/login')
				.send({
					email: 'a@gmail.com',
					password: 'abc123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Invalid email or password');
					done();
				});
		});
	});


	describe('Password change', () => {
		it('should not allow to change password to invalid password', done => {
			chai.request(API)
				.post('/change_password')
				.send({
					email: 'a@gmail.com',
					password: 'aaa111', // changed by reset token
					new_password: '321',
					new_password_confirm: '321'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.a('string');
					done();
				});
		});

		it('should not allow to change password without auth header', done => {
			chai.request(API)
				.post('/change_password')
				.send({
					email: 'a@gmail.com',
					password: 'aaa111', // changed by reset token
					new_password: 'xyz123',
					new_password_confirm: 'xyz123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.a('string');
					done();
				});
		});

		it('should not allow to change password to invalid password', done => {
			chai.request(API)
				.post('/change_password')
				.send({
					email: 'a@gmail.com',
					password: '111', // changed by reset token
					new_password: 'xyz123',
					new_password_confirm: 'xyz123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.a('string');
					done();
				});
		});

		it('should not allow to change password with wrong current password', done => {
			chai.request(API)
				.post('/change_password')
				.set('Authorization', 'Bearer ' + token)
				.send({
					email: 'a@gmail.com',
					password: 'abc123',
					new_password: 'xyz123',
					new_password_confirm: 'xyz123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.a('string');
					done();
				});
		});


		it('should not allow to change password for unknown email', done => {
			chai.request(API)
				.post('/change_password')
				.set('Authorization', 'Bearer ' + token)
				.send({
					email: 'bbb@gmail.com',
					password: 'abc123',
					new_password: 'xyz123',
					new_password_confirm: 'xyz123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Email not found');
					done();
				});
		});

		it('should not allow to change password for invalid email', done => {
			chai.request(API)
				.post('/change_password')
				.set('Authorization', 'Bearer ' + token)
				.send({
					email: 'aaa@@@++++',
					password: 'abc123',
					new_password: 'xyz123',
					new_password_confirm: 'xyz123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Invalid email');
					done();
				});
		});


		it('should not allow to change password without current password', done => {
			chai.request(API)
				.post('/change_password')
				.set('Authorization', 'Bearer ' + token)
				.send({
					email: 'a@gmail.com',
					new_password: 'xyz123',
					new_password_confirm: 'xyz123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Current password is required');
					done();
				});
		});


		it('should not allow to change password without confirm password', done => {
			chai.request(API)
				.post('/change_password')
				.set('Authorization', 'Bearer ' + token)
				.send({
					email: 'a@gmail.com',
					password: 'abc123',
					new_password: 'xyz123',
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Password does not match');
					done();
				});
		});


		it('should not allow to change password for invalid new password', done => {
			chai.request(API)
				.post('/change_password')
				.set('Authorization', 'Bearer ' + token)
				.send({
					email: 'a@gmail.com',
					password: 'abc123',
					new_password: '123',
					new_password_confirm: '123',
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Password must be 6-24 characters, including letters and digits');
					done();
				});
		});


		it('should allow to change password', done => {
			chai.request(API)
				.post('/change_password')
				.set('Authorization', 'Bearer ' + token)
				.send({
					email: 'a@gmail.com',
					password: 'aaa111',
					new_password: 'xyz123',
					new_password_confirm: 'xyz123'
				})
				.end((err, res) => {
					checkHeaders(res, 200);
					res.body.token.should.be.a('string');

					// Update token
					newToken = res.body.token;
					done();
				});
		});

		it('should not return user info for old token', done => {
			chai.request(API)
				.post('/index')
				.set('Authorization', 'Bearer ' + token)
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.a('string');
					done();
				});
		});

		it('should return user info for new token', done => {
			chai.request(API)
				.post('/index')
				.set('Authorization', 'Bearer ' + newToken)
				.end((err, res) => {
					checkHeaders(res, 200);
					res.body.id.should.be.a('number');
					res.body.email.should.be.a('string');
					Object.keys(res.body).length.should.be.equal(2);
					done();
				});
		});

	});

	describe('Handle GET for POST methods', () => {
		const ENDPOINTS = [
			'/create',
			'/login',
			'/forgot',
			'/reset_password'
		];

		ENDPOINTS.forEach(url => {
			it(`should show error about empty body for ${url}`, done => {
				chai.request(API)
					.get(url)
					.end((err, res) => {
						checkHeaders(res, 400);
						res.body.err_msg.should.be.equal('Empty body');
						done();
					});
			});
		});

		it('should show error about empty body for /change_password', done => {
			chai.request(API)
				.get('/change_password')
				.set('Authorization', 'Bearer ' + newToken)
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Empty body');
					done();
				});
		});
	});

	describe('Lock account', () => {

		// TODO lock timeout

		const N = 5;
		it(`should lock account after ${N} times`, function (done) {
			this.timeout(5000);

			const promises = [];
			for (let i = 0; i < N; i++) {
				promises.push(new Promise((resolve) => {
					setTimeout(() => {
						chai.request(API)
							.post('/login')
							.send({
								email: 'a@gmail.com',
								password: '000000'
							})
							.end(resolve);
					}, i * 200);
				}));
			}

			Promise
				.all(promises)
				.then(() => {
					chai.request(API)
						.post('/login')
						.send({
							email: 'a@gmail.com',
							password: '000000'
						})
						.end((err, res) => {
							checkHeaders(res, 403);
							res.body.err_msg.should.be.equal('Account locked');
							done();
						});
				});

		});


		it('should not allow to change password for locked account', done => {
			chai.request(API)
				.post('/change_password')
				.set('Authorization', 'Bearer ' + newToken)
				.send({
					email: 'a@gmail.com',
					password: 'xyz123',
					new_password: 'npm333',
					new_password_confirm: 'npm333'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Invalid token'); // Refused by JWT auth policy
					done();
				});
		});
	});
});
