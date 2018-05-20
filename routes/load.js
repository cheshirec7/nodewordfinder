/*jshint esversion: 6 */
/*jslint node: true */

"use strict";

let fs = require('fs'),
    memjs = require('memjs');

function loadMemcache(idx, conn) {
    return new Promise(function (resolve, reject) {
        fs.readFile(__dirname + '/wordlists/wl_' + idx + '.txt', {encoding: 'utf-8'}, function (err, file_data) {
            if (err) {
                reject(err);
            } else {
                let mc = memjs.Client.create(process.env.MEMCACHIER_SERVERS);
                mc.set('wl_' + idx, file_data, {expires: 0}, function (err, val) {
                    // conn.close();
                    if (err) {
                        reject(err);
                    } else {
                        resolve(idx);
                    }
                });
            }
        });
    });
}

/////
function loadMongo(idx, collection) {
    return new Promise(function (resolve, reject) {
        fs.readFile(__dirname + '/wordlists/wl_' + idx + '.txt', {encoding: 'utf-8'}, function (err, file_data) {
            if (err) {
                reject(err);
            } else {
                let o = {wl: idx, words: file_data};

                collection.insert(o, function (err, inserted) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(idx);
                    }
                });
            }
        });
    });
}

/////
function loadSQL(idx, conn) {
    return new Promise(function (resolve, reject) {
        if (idx === 100) {
            let query = conn.query('DROP TABLE IF EXISTS wordlists', function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(idx);
                }
            });
        } else if (idx === 101) {
            let query = conn.query('CREATE TABLE wordlists (id int(10) unsigned NOT NULL,words mediumtext NOT NULL,PRIMARY KEY (id)) ENGINE=MyISAM DEFAULT CHARSET=utf8;', function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(idx);
                }
            });
        } else {
            fs.readFile(__dirname + '/wordlists/wl_' + idx + '.txt', {encoding: 'utf-8'}, function (err, file_data) {
                if (err) {
                    reject(err);
                } else {
                    let obj_insert = {id: idx, words: file_data},
                        query = conn.query('INSERT INTO wordlists SET ?', obj_insert, function (err, result) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(idx);
                            }
                        });
                }
            });
        }
    });
}

/////
exports.data = function (req, res) {
    let promises_arr = [], sm = 0, coll;

    if (req.query.sm) { //8=files 9=sql 10=cache 11=mongo
        sm = parseInt(req.query.sm);
    }

    if (sm < 9 || sm > 11) {
        res.send('Format: http://nodewordfinder.herokuapp.com/load?sm=(10=memcache,11=mongo)');
        return;
    }

    if (sm === 9) {
        promises_arr.push(loadSQL(100, res.mysql_pool));
        promises_arr.push(loadSQL(101, res.mysql_pool));
    } else if (sm === 11) {
        coll = res.mongodb.collection('wordlists');
    }

    for (let i = 2; i < 25; i++) {
        switch (sm) {
            case  9:
                promises_arr.push(loadSQL(i, res.mysql_pool));
                break;
            case 10:
                promises_arr.push(loadMemcache(i, res.mc_conn));
                break;
            case 11:
                promises_arr.push(loadMongo(i, coll));
                break;
        }
    }

    Promise.all(promises_arr).then(function (idx_arr) {
        switch (sm) {
            case  9:
                res.mysql_pool.release();
                break;
            case 10:
                break;//res.mc_conn.close(); break;
            case 11:
                res.mongodb.close();
                break;
        }
        res.send(idx_arr.toString());
    }).catch(function (reason) {
        console.log(reason);
        res.send(reason.toString());
    });
};