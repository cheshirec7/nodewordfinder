"use strict";
var RSVP = require('rsvp'),
	fs = require('fs');

function loadMemcache(idx, conn) {
	return new RSVP.Promise( function( resolve, reject ) {
		fs.readFile(__dirname + '/wordlists/wl_'+idx+'.txt', {encoding: 'utf-8'}, function(err, file_data){
			if ( err ) 
				reject ( err );
			else {
				var conn = memjs.Client.create();
				conn.set('wl_'+idx, file_data, function(err, val) {
					conn.close();
					if ( err ) 
						reject( err );
					else
						resolve( idx );
				})
			}
		})
	})
}
/////
function loadMongo(idx, collection) {
	return new RSVP.Promise( function( resolve, reject ) {
		fs.readFile(__dirname + '/wordlists/wl_'+idx+'.txt', {encoding: 'utf-8'}, function(err, file_data){
			if ( err ) 
				reject ( err );
			else {
				var o = {}
				o.wl = idx;
				o.words = file_data;
				collection.insert(o, function (err, inserted) {
					if ( err ) 
						reject ( err );
					else	
						resolve( idx );
				})
			}
		})
	})
}
/////
function loadSQL(idx, conn) {
	return new RSVP.Promise( function( resolve, reject ) {
		if (idx == 100) {
			var query = conn.query('DROP TABLE IF EXISTS wordlists', function(err, result) {
				if ( err ) 
					reject ( err );
				else	
					resolve( idx );
			})
		} else if (idx == 101) {
			var query = conn.query('CREATE TABLE wordlists (id int(10) unsigned NOT NULL,words mediumtext NOT NULL,PRIMARY KEY (id)) ENGINE=MyISAM DEFAULT CHARSET=utf8;', function(err, result) {
				if ( err ) 
					reject ( err );
				else	
					resolve( idx );
			})
		} else {		
			fs.readFile(__dirname + '/wordlists/wl_'+idx+'.txt', {encoding: 'utf-8'}, function(err, file_data){
				if ( err ) 
					reject ( err );
				else {
					var obj_insert = {id: idx, words: file_data};
					var query = conn.query('INSERT INTO wordlists SET ?', obj_insert, function(err, result) {
						if ( err ) 
							reject ( err );
						else	
							resolve( idx );
					})
				}
			})
		}
	})
}
/////
exports.data = function(req, res){
	var promises_arr = [], sm = 0;
	
	if (req.query.sm) //8=files 9=sql 10=cache 11=mongo
		sm = parseInt(req.query.sm);
		
	if (sm < 9 || sm > 11) {
		res.send('Format: http://nodewordfinder.herokuapp.com/load?sm=(10=memcache,11=mongo)');
		return;
	}
	
	if (sm == 9) {
		promises_arr.push( loadSQL(100, res.mysql_pool) );
		promises_arr.push( loadSQL(101, res.mysql_pool) );
	} else if (sm == 11)
		var coll = res.mongodb.collection('wordlists');
		
	for (var i=2; i < 25;i++) {
		switch(sm) {
			case  9: promises_arr.push( loadSQL(i,res.mysql_pool) ); break;
			case 10: promises_arr.push( loadMemcache(i,res.mc_conn) ); break;
			case 11: promises_arr.push( loadMongo(i,coll) ); break;
		}
	}
	
	RSVP.all( promises_arr ).then( function( idx_arr ) {	
		switch(sm) {
			case  9: res.mysql_pool.release(); break;
			case 10: break;//res.mc_conn.close(); break;
			case 11: res.mongodb.close(); break;
		}
		res.send( idx_arr.toString() );
	}).catch(function(reason){
		console.log(reason);
		res.send(reason.toString());
	});
}