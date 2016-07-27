var express = require("express");
var mongo = require("mongodb").MongoClient;
//var mongoUrl = 'mongodb://localhost:27017/fcc-backend';
var mongoUrl = process.env.MONGOLAB_URI;
var request = require("request");
var app = express();
var searchHeaders = {
    'Ocp-Apim-Subscription-Key': 'ea0c69c4eab94f07937cd474c9f5ac7c'
};
var searchUrl = 'https://api.cognitive.microsoft.com/bing/v5.0/images/search?count=10&q=';

function fetchLatestTerms(res) {
    mongo.connect(mongoUrl, function(err, db) {
        if (err) console.log(err);
        db.collection('searchhistory').find({}, {
            _id: 0
        }).sort({
            searchDate: -1
        }).limit(10).toArray(function(err, documents) {
            if (err) console.log(err);
            var objects = [];
            console.log(documents);
            for (var i = 0; i < documents.length; i++) {
                var object = {
                    term: documents[i].searchTerm,
                    when: documents[i].searchDate
                };
                objects.push(object);

            }
            res.send(objects);
        });
        db.close();
    });
}

function dbInsert(queryTerm) {
    mongo.connect(mongoUrl, function(err, db) {
        if (err) {
            console.log("error inserting to db");
        }
        var object = {
            searchTerm: queryTerm,
            searchDate: new Date()
        };
        db.collection('searchhistory').insert(object, function(err, data) {
            if (err) return console.log('error inserting to db' + err);
            console.log('successfully inserted ' + object.searchTerm + ' ' + object.searchDate);
        });
        db.close();
    });
}
app.get('/api/imagesearch/:query', function(req, res) {
    var query = req.params.query;
    var offset = req.params.offset;
    if (!offset) offset = 10;
    var searchOpts = {
        url: searchUrl + query + '&offset=' + offset,
        headers: searchHeaders
    };
    var urls = {};
    request(searchOpts, function(err, response, body) {
        if (err) throw err;
        urls = JSON.parse(body);
        var objects = [];
        for (var i = 0; i < urls.value.length; i++) {
            var object = {
                url: urls.value[i].contentUrl,
                snippet: urls.value[i].name,
                thumbnail: urls.value[i].thumbnailUrl,
                context: urls.value[i].hostPageDisplayUrl
            };
            objects.push(object);
        }
        dbInsert(req.params.query);
        res.send(objects);
    });

});

app.get('/latest/imagesearch/', function(req, res) {
    fetchLatestTerms(res);
});

app.listen(process.env.PORT || 8080);