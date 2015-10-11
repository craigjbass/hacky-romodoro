var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var r = require('rethinkdb');
var d = require( './database' );

d.$r(function(connection){
    r.db('test').tableCreate('users').run(connection, function(err, result) {
        if(err) return;
    });
});

d.$r(function(connection) {
    r.db('test').table('users').changes().run(connection, function(err,cursor) {
        cursor.each( function(err,data) {
            io.sockets.emit('news',data);
        } );
    })
});

setInterval(function() {
    d.$r(function(connection){
        r.db('test').table('users').filter(function (user) {
            return user("heartbeat")
                .during(r.now().sub(365*24*30*60), r.now().sub(60));
        }).delete().run(connection);
    });
}, 5000);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/views/index.html');
});

io.on('connection', function (socket) {

    socket.on( 'NewUser', function() {
        d.$r(function(connection){
            r.db('test')
                .table('users')
                .insert(
                {
                    name: '',
                    heartbeat: r.now(),
                    currentTimer: null,
                    type: null
                }
            ).run(connection)
                .then(function(result) {
                    socket.emit( 'init', result.generated_keys[0] );
                })
        });
    } );

    socket.on( 'GetFresh', function() {
        d.$r(function(connection){
            r.db('test')
                .table('users')
                .run(connection)
                .then(function(cursor) {
                    return cursor.toArray();
                }).then(function(results){
                    socket.emit('full-data', results);
                });
        });
    } );

    socket.on( 'SetName', function( request ) {
        console.log(request);
        d.$r(function(connection) {
            r.db('test')
                .table('users')
                .get(request.id)
                .update({ name:request.name })
                .run(connection);
        });
    } ) ;

    socket.on( 'heartbeat', function( request ) {
        d.$r(function(connection) {
            r.db('test')
                .table('users')
                .get(request.id)
                .update({heartbeat: r.now()})
                .run(connection);
        });
    } );

    socket.on( 'timer-status', function( request) {
        d.$r(function(connection) {
            r.db('test')
                .table('users')
                .get(request.id)
                .update({currentTimer: request.remaining})
                .run(connection);
        });
    });

});

server.listen(3000, function(){
    console.log('listening on *:3000');
});


module.exports = app;
