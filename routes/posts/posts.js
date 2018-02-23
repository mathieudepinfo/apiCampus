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

/* Route used to get all the news in the database */ 
router.get("/news",VerifyToken.AsUser,(req,res,next)=>{
	DB.all('SELECT * FROM NEWS',(err,data)=>{
		if(err){
			console.log("Error while getting news");
			return next(err);
		}


		return res.json(data);
	});
})