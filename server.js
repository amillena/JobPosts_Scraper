var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var exphbs = require("express-handlebars");

// Requiring models
var Note = require("./models/Note.js");
var Story = require("./models/Story.js");

// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

var app = express();
var port = process.env.PORT || 8080;


app.use(express.static(process.cwd() + "/public"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text());
app.use(bodyParser.json({ type: "application/vnd.api+json" }));

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// Database configuration with mongoose
//mongoose.connect("mongodb://heroku_3g888fzh:5ui81vhbuai5umnscnv1dulk7l@ds153710.mlab.com:53710/heroku_3g888fzh");
//var db = mongoose.connection;

//mongoose.connect("mongodb://localhost/mongojobs");

//Database configuration with mongoose
var databaseUri = "mongodb://localhost/mongojobs";
  if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI);
    }else{
    mongoose.connect(databaseUri);
  }



var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});

//Routes

app.get("/", function(req, res) {

      var query = Story.find({}).sort({$natural: 1,date:1}).limit(10);
     //var query = Story.find({$query: {}, $orderby: { date : -1 }} ).limit(100);
      
      query.exec(function(err, docs){

          if(err){
            throw error;
          }

          res.render("index",{story: docs});
      });
    });

//Scraping Jobs from CraigsList
app.get("/scrape", function(req, res) {

  
  request("https://sfbay.craigslist.org/search/eby/web", function(error, response, html) {  

    var $ = cheerio.load(html);
    
    $("li.result-row").each(function(i, element) {
          var result = {};
          var host = "//sfbay.craigslist.org";

          result.title = $(this).find("p.result-info").find("a.result-title").text();
          link =  $(this).find("p.result-info").find("a.result-title").prop("href");
          result.link = host + link;
          result.location= $(this).find("span.result-hood").text();
          result.date = $(this).find("time.result-date").text();
          // result.image = $(this).find("a").find("img").attr("src");
          result.saved = false;


          var entry = new Story(result);
          entry.save(function(err, doc) {   

            if (err) {
              console.log(err);
            }
            else {
              console.log("-----------------------------------------------");
              console.log(doc);
            }
      });
      // closing entry.save

    });
    //closing div.listEntry


    });
    // closing request

    res.redirect("/");

  });
 // closing app.get

//Get Job Posts from DB
app.get("/stories", function(req, res) {
  // Grab every doc in the Job Post array
  Story.find({}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});

// Grab an article by it's ObjectId
app.get("/stories/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  Story.findOne({ "_id": req.params.id })
  // ..and populate all of the notes associated with it
  .populate("note")
  // now, execute our query
  .exec(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise, send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});


app.get("/saved", function(req,res){

    Story.find({saved:true}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser as a json object
    else {
      res.render("saved",{story: doc});
    }
  });

});

// Change from false to true
app.post("/updates/:id", function(req,res){

  Story.where({ _id: req.params.id }).update({ $set:{saved: true }})

      .exec(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise, send the doc to the browser as a json object
    else {

      res.json(doc)
    }
  });

});

// Change from true to false
app.post("/updates/:id/:saved", function(req,res){

  Story.where({_id: req.params.id, saved:true }).update({ $set:{saved: false }})

      .exec(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise, send the doc to the browser as a json object
    else {

      res.json(doc)
    }
  });

});

// Post notes
app.post("/notes/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  var newNote = new Note(req.body);
  console.log(newNote);

  // And save the new note the db
  newNote.save(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
      // Use the article id to find and update it's note
      Story.findOneAndUpdate({ "_id": req.params.id },{ "note": doc._id })
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);
        }
      });
    }
  });
});

// Grab an JOb Posts by it's ObjectId
app.get("/notes/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  Story.findOne({ "_id": req.params.id })
  // ..and populate all of the notes associated with it
  .populate("note")
  // now, execute our query
  .exec(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise, send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});

app.listen(port, function() {
  console.log("App running on port " + port);
});
