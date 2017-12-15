// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3002;

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

// Routing
//app.use(express.static(path.join(__dirname, 'public')));

const minutes = 60; // seconds per minute
const hours = 60 * 60; // seconds per hour
const days = 60 * 60 * 24; // seconds per day


io.on('connection', function (socket) {

    var populateDraft = function (rounds, teams) {
        console.log("populateDraft(" + rounds + ", " + teams.length + ")");
        var draft = [];
        var total = rounds * teams.length;
        var count = 0;

        for (var r = 1; r <= rounds; r += 1) {
            var start;
            var end;
            var incr;
            var s = 1; //selection

            // odd rounds (1, 3, 5, ...) count up from 1 ... N
            if (r % 2 == 1) {
                start = 1;
                end = function (v) {
                    return v <= teams.length;
                };
                incr = 1;
                // even rounds (2, 4, 6, ...) count down from N ... 1
            } else {
                start = teams.length;
                end = function (v) {
                    return v >= 1;
                };
                incr = -1;
            }

            for (var t = start; end(t); t += incr) {
                count += 1;
                var percent = count / total * 100;
                draft.push({
                    round: r,
                    rounds: rounds,
                    selection: s,
                    team: teams[t - 1],
                    teams: teams,
                    percent: percent
                });
                s += 1;
            }
        }
        return draft;
    };

    var formatSeconds = function (s) {
        var d = Math.floor(s / days);
        s -= d * days;
        var h = Math.floor(s / hours);
        s -= h * hours;
        var m = Math.floor(s / minutes);
        s -= m * minutes;

        var str = "";
        if (d > 0) {
            str += d + ".";
        }
        if (h > 0) {
            str += h + ":";
        }
        if (m < 10) {
            str += "0" + m + ":";
        } else {
            str += m + ":";
        }
        if (s < 10) {
            str += "0" + s;
        } else {
            str += s;
        }

        return str;
    };



    let start; // when each player started his/her turn
    let totalStart; // when the overall draft started

    let draftLager;
    let draftPorter;

    // when moving to the next round
    socket.on('next round', function (data) {

        if (draft.length > 0) {
            let current;

            // get the next 'player'
            if (data.name === 'Team Lager')
                current = draftLager.shift();
            if (data.name === 'Team Porter')
                current = draftPorter.shift();

            // record when this player started
            start = new Date();

            // fire off the clock
            //this.timer = setTimeout(this.tick, 1000);

            // ... else draft is over
        } else {
            if (data.name === 'Team Lager')
                draftLager = populateDraft(24, data.players);
            if (data.name === 'Team Porter')
                draftPorter = populateDraft(24, data.players);

            // shut down the UI
            var s = Math.floor((new Date() - totalStart) / 1000);
            var str = formatSeconds(s);
        }

        if (current) {
            socket.broadcast.emit('nextRound', {
                current
            });
        }
    });
});