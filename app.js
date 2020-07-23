
//instantiate express
const express = require('express');
//assign app variable to express 
const app = express();

//load http module and create webserver with express
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = 5000;

//instantiate mysql
const mysql = require('mysql');

//log connection in console
http.listen(port, function () {
    console.log('Running server on port ' + port);
});

//point app to correct folder for execution calls
app.use(express.static(__dirname + '/public'));
//set default page
app.use(express.static(__dirname + '/public', {index: 'Default.html'}));
//if user types in an incorrect url, display appropriate message
app.use(function(req, res, next) {
        res.status(404).send('404 error: File not found!');
});

//build mysql credentials
const config = require('./config.js');
const db = config.database;

const sql = mysql.createConnection({
  host     : db.host,
  user     : db.user,
  password : db.password,
  database : db.database
});


function databaseConnectionAttempt(attempt) {
	//connect to MySQL
	sql = mysql.createConnection(sql.config);
	//if cannot connect for any reason, continue to try every five seconds
	sql.connect(function(err) {

		if(err) {
			setTimeout(function() {
				console.log('Attempt #' + attempt + ' to reconnect to MySQL.');
				databaseConnectionAttempt(++attempt);
			}, 5000); 
		}  		
	});
	//if while connected, and MySQL goes down, then try reconnecting every five seconds
	sql.on('error', function(err) {
		// Unexpected closing of connection, reconnect.
		setTimeout(function() {
			//set attempt to first try "1"
			databaseConnectionAttempt(1);
		}, 5000);
	});
}

//connect to MySQL
databaseConnectionAttempt(1);

io.on('connection', function (socket) {
  	console.log("User connected from ip: " + socket.handshake.address);
  	console.log("	DateTime: " + new Date().toLocaleString('en-US'));

 	//select all from the table and display to the client
	sql.query('Select * from FactoryNodes', function(err,rows,fields) {

		if(err) {
			console.log(err);
			socket.emit('errorMessageForSQL','Error retrieving data!')
		}
		else {
			//fetch and display the data from MySQL "Select" statement
			socket.emit('get',rows);
		}
 	});

  //listen for the set function and insert the data received from the btnSubmitFactory click event
  socket.on('set', function (data) {
  	console.log("Set function called with the following data:");
  	console.log("	ID: " + data.id);
  	console.log("	Name: " + data.name);
  	console.log("	Lower: " + data.lower);
  	console.log("	Upper: " + data.upper);
  	console.log("	Count: " + data.count);
  	console.log("	IP: " + socket.handshake.address);
  	console.log("	DateTime: " + new Date().toLocaleString('en-US'));
  	
  	//validate all data first
  	if(Validator(data.id,data.name,data.lower,data.upper,data.count,socket)) {
  		//data.id will be passed over as zero for new inserts
  	  	if(data.id == 0) {
	  		sql.query('insert into FactoryNodes set ?', {
				"name": data.name,
				"lower": data.lower,
				"upper": data.upper,
				"count": data.count,
				"children": addCounts(parseInt(data.lower),parseInt(data.upper),parseInt(data.count))
			}, function(err,result) {
				if (err) {
					console.log(err);
					socket.emit('errorMessageForSQL','Error inserting data!');
				}
				else {
					RetrieveData();
				}
			});	
  		}
		//call for an update
	  	else {
		  	sql.query('update FactoryNodes set ? where id =' + mysql.escape(data.id), {
				"name": data.name,
				"lower": data.lower,
				"upper": data.upper,
				"count": data.count,
				"children": addCounts(parseInt(data.lower),parseInt(data.upper),parseInt(data.count))
			}, function(err,result) {
				if(err) {
					console.log(err);
					socket.emit('errorMessageForSQL','Error updating data!');
				}
				else {
					RetrieveData();
				}
			});
	  	}
    }
 });

  //listen for "deleteID" to be called and delete data from table and display back to the user.
  socket.on('deleteID',function(id) {
  	console.log("Deleting ID: " + id);
  	console.log("	IP: " + socket.handshake.address);
  	console.log("	DateTime: " + new Date().toLocaleString('en-US'));

  	sql.query('delete from FactoryNodes where id =' + mysql.escape(id), function(err,rows,fields){

  		if(err) 
			socket.emit('errorMessageForSQL','Error deleting data!');
  		else 
  			RetrieveData();
  	});
  });

  //listen for "populateModalWithID" to be called and populate the Factory Modal with the info gathered from the context menu option "Edit."
  socket.on('populateModalWithID',function(id) {
  	console.log("Requesting ID: " + id);
  	console.log("	IP: " + socket.handshake.address);
  	console.log("	DateTime: " + new Date().toLocaleString('en-US'));

  	sql.query('Select * from FactoryNodes where id =' + mysql.escape(id), function(err,rows,fields) {

  		if(err) 
			socket.emit('errorMessageForSQL','Error populating data!');
  		else 
  			socket.emit('populateModal',rows);
  	})
  });
});

//use recursive function for generating a comma separated list of random numbers based off of the "count" parameter.
function addCounts(lower,upper,count) {
	var random = Math.floor(Math.random() * (upper - lower + 1) + lower);

	if (count <= 1)
		return random;

	return random + ',' + addCounts(lower,upper,count - 1);
};

//retrieve data from MySQL and display to all
function RetrieveData() {
	sql.query('Select * from FactoryNodes', function(err,rows,fields) {

		if(err) 
			io.emit('errorMessageForSQL','Error populating data!');
		else 
			io.emit('get',rows);
	});
};

//Validate Inputs
function Validator(id,name,lower,upper,count,socket) {

	if(id == '') {
		socket.emit('errorMessage','Id field cannot be blank!')
		return false;
	}

	if(id != id.replace(/[^0-9]/g)) {
		socket.emit('errorMessage','Id field must be a non-negative integer!')
		return false;
	}

	if(parseInt(id) > 2147483647) {
		socket.emit('errorMessage','Id cannot be greater than 2147483647!');
		return false;
	}

	if(name == '') {
		socket.emit('errorMessage','Factory name cannot be blank!');
		return false;
	}

	if(name.length > 255) {
		socket.emit('errorMessage','Factory Name needs to be less than 256 characters!');
		return false;
	}

	if(lower == '') {
		socket.emit('errorMessage','Lower bound cannot be blank!');
		return false;
	}

	if(lower != lower.replace(/[^0-9]/g)) {
		socket.emit('errorMessage','LowerBound number must be a non-negative integer!');
		return false;
	}

	if(parseInt(lower) == 0) {
		socket.emit('errorMessage','LowerBound cannot be zero!');
		return false;
	}

	if(parseInt(lower) > 2147483647) {
		socket.emit('errorMessage','LowerBound cannot be greater than 2147483647!');
		return false;
	}

	if(upper == '') {
		socket.emit('errorMessage','UpperBound cannot be blank!');
		return false;
	}

	if(upper != upper.replace(/[^0-9]/g)) {
		socket.emit('errorMessage','UpperBound number must be a non-negative integer!');
		return false;
	}

	if(parseInt(upper) == 0) {
		socket.emit('errorMessage','UpperBound cannot be zero!');
		return false;
	}

	if(parseInt(upper) > 2147483647) {
		socket.emit('errorMessage','UpperBound cannot be greater than 2147483647!');
		return false;
	}

	if(count == '') {
		socket.emit('errorMessage','Count cannot be blank!');
		return false;
	}

	if(count != count.replace(/[^0-9]/g)) {
		socket.emit('errorMessage','Count must be a non-negative integer.');
		return false;
	}

	if(parseInt(count) > 15) {
		socket.emit('errorMessage','Count cannot be greater than 15!');
		return false;
	}

	if(parseInt(count) < 1) {
		socket.emit('errorMessage','Count cannot be less than 1!');
		return false;
	}

	if(parseInt(lower) > parseInt(upper)) {
		socket.emit('errorMessage','Upperbound must be greater than or equal to the lowerbound.');
		return false;
	}

	return true;
}