# JSON Web Token authorization API
## Based on [Sails.js](http://sailsjs.com/) 

[![Greenkeeper badge](https://badges.greenkeeper.io/Deliaz/sails-api-jwt.svg)](https://greenkeeper.io/)

[![Build status](https://travis-ci.org/Deliaz/sails-api-jwt.svg?branch=master)](https://travis-ci.org/Deliaz/sails-api-jwt)
[![Coverage Status](https://coveralls.io/repos/github/Deliaz/sails-api-jwt/badge.svg?branch=master)](https://coveralls.io/github/Deliaz/sails-api-jwt?branch=master)


__An example implementation of JWT-based API for user registration and authorization.__ 
<br>

It supports:
1. User register;
2. User login;
3. Token generation and validation;
4. Password reset (with a reset token);
5. Password change (with JWT credentials);
6. Account locking.

Things to do: 
1. Optional email notifications (based on environment);
2. Keep reset token encrypted and with a validity date;
3. Unlock after some freeze period;
4. Registration confirmation (with a confirm token).

* * * * *

## Start
```
npm run start
```
or, if you have Sails globally:
```
sails lift
```
For security reasons, please change __JWT_SECRET__ in `api/config/env/development.js`. 



## JWT Token

Token-free endpoints: 
```
/user/create
/user/login
/user/forgot
/user/reset_password
```  

Token-required endpoints: 
```
/user
/change_password 
```

To pass a JWT token use `Authorization` header: 
```
Authorization: Bearer <JWT Token>
```

## API methods description
For some reasons I do not use REST. Shortcuts also disabled by default 
(see `api/config/blueprints.js`).

#### `/user/create` 
Creates a new user. Requirements for the password: length is 6-24, use letters and digits. 

__request__ 
```json
{
  "email": "email@example.com",
  "password": "abc123",
  "password_confirm": "abc123"
}
```

__response__
```json
{
  "token": "<JWT Token>"
}
```


#### `/user/login` 
__request__ 
```json
{
  "email": "email@example.com",
  "password": "abc123"
}
```

__response__
```json
{
  "token": "<JWT Token>"
}
```
N.B. Account will be blocked after `5` fails in `2 mins` (configurable in `api/services/UserManager.js`). 

#### `/user/change_password`
Changes user password. User should be authorized.   

__request__ 
```json
{
  "email": "email@example.com",
  "password": "abc123", 
  "new_password": "xyz321",
  "new_password_confirm": "xyz321"
}
```

__response__
```json
{
  "token": "<JWT Token>"
}
```
N.B. All old tokens will be invalid after changing password.

#### `/user/forgot`
Initiates procedure of password recovery.

__request__ 
```json
{
  "email": "email@example.com"
}
```

__response__
```json
{
  "message": "Check your email"
}
``` 

#### `/user/reset_password`
Reset password to a new one with a reset token. Reset token sends to a user after 
`/user/forgot`.   

__request__ 
```json
{
  "email": "email@example.com",
  "reset_token": "<Password Reset Token>",
  "new_password": "xyz321",
  "new_password_confirm": "xyz321"
}
```

__response__
```json
{
  "message": "Done"
}
```


### HTTP codes
All endpoints uses HTTP status codes to notify about execution results  
* `200` ok, reqeust executed successfully;
* `201` created, new user created successfully;
* `400` bad requests, usually means wrong params;
* `403` forbidden, for locked accounts;
* `500` server error, something went wrong.


### Tests
The project uses Travis-CI and Coveralls integration and has some tests. 
Run it via: 
```
npm run test
``` 



#### Inspired by
This project is based on this repo:
[https://github.com/swelham/sails-jwt-example](https://github.com/swelham/sails-jwt-example) *(unlicensed)*.  
I refactored and improved it for myself.     


#### License
It is MIT. 
