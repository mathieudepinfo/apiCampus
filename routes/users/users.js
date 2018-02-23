'use strict'
const Express 	= require('express');
const router 	= Express.Router();
const DB 		= require('../../db.js');
const Passport 	= require('passport');
const bodyParser= require('body-parser');
const jwt 		= require('jsonwebtoken');
const bcrypt 	= require('bcryptjs');
const config 	= require('../../config');
const BasicStrategy = require('passport-http').BasicStrategy;
const VerifyToken = require('../../verifyToken');
const Joi       = require('joi');
const Celebrate = require('celebrate'); 

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

/**Passport strategy used when a user tries to log in**/
Passport.use(new BasicStrategy((username,password,done)=>{
	console.log("authentification :",username,password);

	DB.get('SELECT * FROM USERS WHERE (USERNAME=? or MAIL=?)',[username,username],(err,user)=>{
		if(err){//bad request
			return done(err);
		}
		if(!user){//username not found
			return done(null,false,{message: "wrong username"});
		}

		if(bcrypt.compareSync(password, user.PASSWORD) === true){
			let token = jwt.sign({ id: user.USERNAME,category:user.CATEGORY }, config.secret, {
      		expiresIn: 86400 // expires in 24 hours
    		});
			return done(null,{token:token,auth:true});
		}
		return done(null,false,{message: "wrong password"});
	});
	
}));

/**Route used to login, returns a token and an auth param**/
router.post('/login',
	Passport.authenticate('basic',{session:false}),(req,res)=>{

	res.json(req.user);
});

/**Route used to register a user, if the new user wants to be an admin or an association another admin should validate the request**/
router.post('/register',Celebrate.celebrate(
	{
		body:Joi.object().keys({
		username: Joi.string().required(),
    password: Joi.string().required(),
    mail: Joi.string().required(),
    school: Joi.string().required(),
    category: Joi.string().required()
		})
	}),
	function(req, res,next) {

	console.log(req.body.username,"wants to register");
  	//password is hashed before being stored into the DB
  	let hashedPassword = bcrypt.hashSync(req.body.password, 8);
  	console.log(hashedPassword);

  	if(req.body.category === "student"){ 
    //students can register on their owns
  		DB.run('INSERT INTO USERS (MAIL,PASSWORD,USERNAME,POINTS,SCHOOL,CATEGORY) VALUES (?,?,?,?,?,?)',
  					[req.body.mail,hashedPassword,req.body.username,0,req.body.school,"student"],(err) => {
    		if (err){
    			console.log("There was a problem registering the user.");
    			return next(err);
    		} 
    		console.log('User: '+req.body.username+' registered!');
    		return res.status(200).end();
  		}); 
  	}
  	else{//associations and admins registrations need to be validated so they are inserted into the request table
  		DB.run('INSERT INTO REQUESTS (MAIL,PASSWORD,USERNAME,POINTS,SCHOOL,CATEGORY) VALUES (?,?,?,?,?,?)',
  					[req.body.mail,hashedPassword,req.body.username,0,req.body.school,req.body.category],(err) => {
    		if (err){
    			console.log("There was a problem registering the request.");
    			return next(err);
    		} 
    		console.log('Request waiting for acceptation by admin');
    		return res.status(200).end();
  		}); 
  	}
});

/**Route used to validate a request, requires admin privileges**/
router.post('/validate/:id',Celebrate.celebrate(
{
	body:Joi.object().keys({
	validation:Joi.required() //validation should be a string "true" or "false"
  })
}),
VerifyToken.AsAdmin,function(req, res,next) {

  	console.log("validation of request number:",req.params.id);
  	DB.get('SELECT * FROM REQUESTS WHERE ID=?',[req.params.id],(err,data) => {
		
    	if (err){
    		console.log("There was a problem processing the request");
    		return next(err);
    	} 

    	if(data==undefined){
    		console.log("Request doesn't exist");
    		return res.status(500).end();
    	}

    	DB.run('DELETE FROM REQUESTS WHERE ID=?',[req.params.id],(err2)=>{
    		if(err2){
    			console.log("There was a problem deleting the request");
    			return next(err2);
    		}
    	});

    	if(req.body.validation === "true"){
    		console.log("Accepted request:",data);
    		DB.run('INSERT INTO USERS (MAIL,PASSWORD,USERNAME,POINTS,SCHOOL,CATEGORY) VALUES(?,?,?,?,?,?)',[data.MAIL,data.PASSWORD,data.USERNAME,data.POINTS,data.SCHOOL,data.CATEGORY],(err2)=>{
    			if(err2){
    				console.log("There was a problem adding the user");
    				return next(err2);
    			}
    		});

    	}

    	console.log('Validation successful,',data.USERNAME,'added as',data.CATEGORY);
    	res.status(200).end();
  	}); 
});

/**Route used to get all the requests that are waiting for acceptation**/
router.get('/requests',VerifyToken.AsAdmin,
	(req,res,next) =>{
		DB.all('SELECT * FROM REQUESTS',(err,data)=>{
			if(err){
				return next(err);
			}

			return res.json(data);
		})
	}
)

/**Route used to logout, the token isn't really destroyed**/
router.get('/logout', function(req, res) {
  	res.status(200).send({ auth: false, token: null });
});

/** Route used to get all users **/
router.get('/users',VerifyToken.AsUser,
  (req,res,next) =>{
    DB.all('SELECT * FROM USERS',(err,data)=>{
      if(err){
        return next(err);
      }

      return res.json(data);
    })
  }
)

/**Route used to get a user identified by his id or username**/
router.get('/users/:id',VerifyToken.AsUser,
  (req,res,next) =>{
    DB.get('SELECT * FROM USERS WHERE (ID=? OR USERNAME=?)',[req.params.id],(err,data)=>{
      if(err){
        return next(err);
      }

    return res.json(data);
    })
  }
)

/**Route used to delete a user identified by his id or mail**/
router.delete('/users/:id',VerifyToken.AsAdmin,
  (req, res, next) => {

    console.log(`attempt to delete the user: ${req.params.id}`);
    DB.run('DELETE FROM BOTTLES WHERE (ID = ? || MAIL = ?)', [req.params.id,req.params.id], (err) => {

        if (err) {
            return next(err);
        }
        console.log("User deleted");
        return res.end();
    });
});

module.exports.router = router;