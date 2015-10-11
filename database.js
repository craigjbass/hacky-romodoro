var r = require('rethinkdb');


var connectionContext = function(f) {
    r.connect( {host: 'localhost', port: 28015}, function(err, connection) {
        if (err) throw err;
        f(connection);
    });
};

module.exports = {
    $r: connectionContext
};

