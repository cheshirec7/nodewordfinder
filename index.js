var compression = require('compression'),
    express = require('express'),
    favicon = require('serve-favicon'),
    app = express(),
    env = process.env.NODE_ENV || 'development',
    find = require('./routes/find');

app.set('port', (process.env.PORT || 5000));
app.use(compression());
app.use(express.static(__dirname + '/public'));
app.use(favicon(__dirname + '/public/images/favicon.ico'));

app.locals.title = 'NodeWordFinder';

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(function(req, res, next) {

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.query.rt == 'json')
    res.setHeader("Content-Type", "application/json");
  else
    res.setHeader("Content-Type","text/html; charset=UTF-8");

  next();
  // var sm = 8;
  //
  // if (req.query.sm) //8=files 9=sql 10=cache 11=mongo
  //   sm = parseInt(req.query.sm);

  // switch(sm) {
  //   case 9: mysql_pool.getConnection( function( err, pool ) {
  //     if (err)
  //       next(err);
  //     else {
  //       res.mysql_pool = pool;
  //       next();
  //     }
  //   });
  //     break;
  //   case 10:
  //     //res.mc_conn = memjs.Client.create(),
  //     next();
  //     break;
  //   case 11: MongoClient.connect(process.env.MONGOLAB_URI, function( err, mongodb ) {
  //     if (err)
  //       next(err);
  //     else {
  //       res.mongodb = mongodb;
  //       next();
  //     }
  //   })
  //     break;
  //   default:
  //     next();
  //     break;
  // }
});

app.get('/', function(request, response) {
  response.sendFile(__dirname+'/views/index.html');
});
app.get('/find', find.results);
app.get('/flush', find.cacheflush);

app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


