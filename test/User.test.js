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
					res.should.have.status(401);
					res.should.have.header('content-type', 'application/json; charset=utf-8');
					res.body.err.should.be.string;
					done();
				});
		});

		it('should create a new user', done => {
			chai.request(API)
				.post('/create')
				.send(regInfo)
				.end((err, res) => {
					res.should.have.status(200);
					res.should.have.header('content-type', 'application/json; charset=utf-8');
					res.body.token.should.be.string;

					token = res.body.token;
					done();
				});
		});

		it('should not create a new user with the same info', done => {
			chai.request(API)
				.post('/create')
				.send(regInfo)
				.end((err, res) => {
					res.should.have.status(200);
					res.should.have.header('content-type', 'application/json; charset=utf-8');
					res.body.err.should.be.string;
					res.body.err.should.be.equal('This email is already in use');
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
					res.should.have.status(200);
					res.should.have.header('content-type', 'application/json; charset=utf-8');
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
					res.should.have.status(401);
					res.should.have.header('content-type', 'application/json; charset=utf-8');
					res.body.err.should.be.equal('Invalid email or password');
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
					res.should.have.status(401);
					res.should.have.header('content-type', 'application/json; charset=utf-8');
					res.body.err.should.be.equal('Invalid email or password');
					done();
				});
		});

		it('should return user info object with id', done => {
			chai.request(API)
				.post('/index')
				.set('Authorization', 'Bearer ' + token)
				.end((err, res) => {
					res.should.have.status(200);
					res.should.have.header('content-type', 'application/json; charset=utf-8');
					res.body.id.should.be.a('number');
					done();
				});
		});

		it('should not return user info for not auth', done => {
			chai.request(API)
				.post('/index')
				.set('Authorization', 'AAA')
				.end((err, res) => {
					res.should.have.status(401);
					res.should.have.header('content-type', 'application/json; charset=utf-8');
					res.body.err.should.be.equal('Format is "Authorization: Bearer [token]"');
					done();
				});
		});

		it('should not return user info for bad token format', done => {
			chai.request(API)
				.post('/index')
				.end((err, res) => {
					res.should.have.status(401);
					res.should.have.header('content-type', 'application/json; charset=utf-8');
					res.body.err.should.be.equal('No Authorization header was found');
					done();
				});
		});

		it('should not return user info for invalid token', done => {
			chai.request(API)
				.post('/index')
				.set('Authorization', 'Bearer ' + 'AAA.BBB.CCC')
				.end((err, res) => {
					res.should.have.status(401);
					res.should.have.header('content-type', 'application/json; charset=utf-8');
					res.body.err.should.be.equal('Invalid token');
					done();
				});
		});


		it('should return user not found for random but valid token', done => {
			chai.request(API)
				.post('/index')
				.set('Authorization', 'Bearer ' + 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTgsImlhdCI6MTUwMjU1NDA0NywiZXhwIjoxNTAyNjQwNDQ3fQ.E0NrVER_tPfIr5LtOX-LsMgIwlXrYawuGAHEwyxbdNw')
				.end((err, res) => {
					res.should.have.status(404);
					res.should.have.header('content-type', 'application/json; charset=utf-8');
					res.body.err.should.be.equal('User not found');
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
					res.should.have.status(200);
					res.should.have.header('content-type', 'application/json; charset=utf-8');
					res.body.message.should.be.equal('Check your email');
					done();
				});
		});

		it('should not allow to request reset password for unknown email', done => {
			chai.request(API)
				.post('/forgot')
				.send({email: 'bbb@gmail.com'})
				.end((err, res) => {
					res.should.have.status(404);
					res.should.have.header('content-type', 'application/json; charset=utf-8');

					res.body.err.should.be.equal('User not found');
					done();
				});
		});

		it('should not allow to request reset password for empty email', done => {
			chai.request(API)
				.post('/forgot')
				.end((err, res) => {
					res.should.have.status(401);
					res.should.have.header('content-type', 'application/json; charset=utf-8');

					res.body.err.should.be.equal('Email is required');
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
					res.should.have.status(200);
					res.should.have.header('content-type', 'application/json; charset=utf-8');
					res.body.message.should.be.equal('Done');
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
					res.should.have.status(200);
					res.should.have.header('content-type', 'application/json; charset=utf-8');
					res.body.token.should.be.a('string');
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
					res.should.have.status(401);
					res.should.have.header('content-type', 'application/json; charset=utf-8');
					res.body.err.should.be.equal('Invalid email or password');
					done();
				});
		});
	});

});
