var express = require('express');
var mysql = require('mysql');
var session = require('express-session');
var server = express();
var logger = require('morgan');
var bodyParser = require('body-parser')
var path = require('path');

var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'nodelogin'
});

server.use(logger('dev'));

server.use(express.static(__dirname+'/publik'));


server.use(session({
    secret : 'pbkk2',
    resave : true,
    saveUninitialized : true
}));

server.use(bodyParser.urlencoded({extended : true}));
server.use(bodyParser.json());

server.get('/',function(req,res){
    res.sendFile(path.join(__dirname + '/login.html'));
})

server.get('/register',function(req,res){
    res.sendFile(path.join(__dirname + '/register.html'));
})

server.post('/auth',function(req,res){
    var username = req.body.username;
    var password = req.body.password;
    if (username && password){
        connection.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			if (results.length > 0) {
				req.session.loggedin = true;
				req.session.username = username;
				res.redirect('/home');
			} else {
				res.send('Incorrect Username and/or Password!');
			}
			res.end();
		});
    }
    else{
        res.send('input username password !!');
    }
});

server.post('/register',function(req,res){
    var username = req.body.username;
    var password = req.body.password;
    if (username && password){
        var sql = "INSERT INTO accounts (username, password) VALUES ( '"+username+"','"+password+"')";
        connection.query(sql, function (err, result) {
            if (err) throw err;
            else {
                console.log("1 record inserted to master");

            }
        });

    }
    res.redirect('/')
    res.end();
})

server.get('/home',function(req,res){
    res.send("LOGIN SUKSESFULLII !!")
    // if(req.session.loggedin){
    //     res.send('welcome back ' + req.session.username + '!');

    // }
    // else {
    //     res.send('please login to view this page!');
    //     res.redirect('/');
    //     res.end();
    // }
    // res.end();
})

server.listen(4000, function(){
    console.log('Server file sudah berjalan bos!');
});
