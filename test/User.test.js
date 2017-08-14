const sails = require('sails');
const chai = require('chai');
chai.should();
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

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

	describe('Creating and auth', () => {
		const regInfo = {
			email: 'a@gmail.com',
			password: '123',
			password_confirm: '123'
		};

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
					password: '123',
					password_confirm: '123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Email is required');
					token = res.body.token;
					done();
				});
		});

		it('should create a new user', done => {
			chai.request(API)
				.post('/create')
				.send(regInfo)
				.end((err, res) => {
					checkHeaders(res, 201);

					res.body.token.should.be.a('string');

					token = res.body.token;
					done();
				});
		});

		it('should not create a new user with the same info', done => {
			chai.request(API)
				.post('/create')
				.send(regInfo)
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.a('string');
					res.body.err_msg.should.be.equal('This email is already in use');
					done();
				});
		});

		it('should login successfully', done => {
			chai.request(API)
				.post('/login')
				.send({
					email: 'a@gmail.com',
					password: '123'
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
					password: '123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Invalid email or password');
					done();
				});
		});

		it('should not login for unknow email', done => {
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
			chai.request(API)
				.post('/forgot')
				.send({email: 'a@gmail.com'})
				.end((err, res) => {
					checkHeaders(res, 200);
					res.body.message.should.be.equal('Check your email');
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

					res.body.err_msg.should.be.equal('Email is required');
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

		it('should reset password with reset token', done => {
			chai.request(API)
				.post('/reset_password')
				.send({
					email: 'a@gmail.com',
					reset_token: resetToken,
					new_password: '111',
					new_password_confirm: '111'
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
					password: '111'
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
					password: '123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Invalid email or password');
					done();
				});
		});
	});


	describe('Password change', () => {
		it('should not allow to change password without auth header', done => {
			chai.request(API)
				.post('/change_password')
				.send({
					email: 'a@gmail.com',
					password: '111', // changed by reset token
					new_password: '321',
					new_password_confirm: '321'
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
					password: '123',
					new_password: '321',
					new_password_confirm: '321'
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
					password: '123',
					new_password: '321',
					new_password_confirm: '321'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Email not found');
					done();
				});
		});

		it('should not allow to change password without conform password', done => {
			chai.request(API)
				.post('/change_password')
				.set('Authorization', 'Bearer ' + token)
				.send({
					email: 'a@gmail.com',
					password: '123'
				})
				.end((err, res) => {
					checkHeaders(res, 400);
					res.body.err_msg.should.be.equal('Password does not match');
					done();
				});
		});


		let newToken = null;
		it('should allow to change password', done => {
			chai.request(API)
				.post('/change_password')
				.set('Authorization', 'Bearer ' + token)
				.send({
					email: 'a@gmail.com',
					password: '111',
					new_password: '321',
					new_password_confirm: '321'
				})
				.end((err, res) => {
					checkHeaders(res, 200);
					res.body.token.should.be.a('string');
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

		// TODO Tests for lock/unlock
	});
});
