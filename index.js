'use strict';
const Express 	= require('express');
const BP 		= require('body-parser');

const app = Express();

app.use((req,res,next)=>{

	res.header('Access-Control-Allow-Origin','*'); //for request from the same Computer
	res.header("Access-Control-Allow-Headers","*");//for authentification
	next();

});

app.use(BP.json()); 
app.use(BP.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.use(require('./routes/users/users').router);

app.listen(3000, (err) => {

    if (err) {
        console.log(err);
    }
    else {
        console.log('App listening on port 3000');
    }
});
