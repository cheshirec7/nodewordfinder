/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const express = require('express'),
    path = require('path'),
    PORT = process.env.PORT || 5000,
    compression = require('compression'),
    favicon = require('serve-favicon'),
    // env = process.env.NODE_ENV || 'development',
    find = require('./routes/find'),
    createdd = require('./routes/createdd');

express()
    .set('title', 'NodeWordFinder')
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs')
    .use(express.static(path.join(__dirname, 'public')))
    .use(compression())
    .use(favicon(__dirname + '/public/images/favicon.ico'))
    .use(function (req, res, next) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        if (req.query.rt === 'json') {
            res.setHeader("Content-Type", "application/json");
        } else {
            res.setHeader("Content-Type", "text/html; charset=UTF-8");
        }
        next();
    })
    .get('/', function (req, res) {
        res.sendFile(__dirname + '/views/index.html');
    }).get('/find', find.results)
    .get('/flush', find.cacheflush)
    .get('/createdd', createdd.createdd)
    .use(function (req, res, next) {
        let err = new Error('Not Found');
        err.status = 404;
        next(err);
    }).use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {}
        });
    })
    .listen(PORT, () => console.log(`Listening on ${ PORT }`));
