const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000;
//const url = require('url');
var books = require('google-books-search');

var pg = require('pg');
pg.defaults.ssl = true;
require('dotenv').load();
var connectionString = process.env.DATABASE_URL;
                                            
const { Pool } = require("pg");
const pool = new Pool({ connectionString: connectionString });

var type;
express()
    .use(express.static(path.join(__dirname, 'public')))
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs')

    .get('/books', function (request, response) {
        getBooks(request, response);
    })

    .use(express.json())    
    .use(express.urlencoded(
    {
        extended: true
    })) // to support URL-encoded bodies

    //.post('/addBook', insertBook, params)
    .post('/addBook', function (request, response) {
        //console.log(request.body);      // your JSON
        //var jsonRequest = request.body;
        insertBook(request, response);
        alert("after insert book");
    })

    .get('/', (req, res) => res.render('pages/index'))    
    .listen(PORT, () => console.log(`Listening on ${PORT}`))

var defaultOptions = {
    // Google API key
    key: null,
    // Search in a specified field
    field: null,
    // The position in the collection at which to start the list of results (startIndex)
    offset: 0,
    // The maximum number of elements to return with this request (Max 40) (maxResults)
    limit: 30,
    // Restrict results to books or magazines (or both) (printType)
    type: 'all',
    // Order results by relevance or newest (orderBy)
    order: 'relevance',
    // Restrict results to a specified language (two-letter ISO-639-1 code) (langRestrict)
    lang: 'en'
};

function getBooks(request, response) {
    var param = request.query.param;
    type = request.query.type;
    var myBooksList = [];

    getBooksFromDb(param, function (error, myResults) {
        if (error || myResults == null ) {
            response.status(500).json({
                success: false,
                data: error
            });
        } else {
            myBooksList = myResults;
        }
    });

    getBookList(param, function (error, results) {
        if (error || results == null) {
            response.status(500).json({
                success: false,
                data: error
            });
        } else {
            var List = results;
            var data = [];

            for (var i = 0; i < List.length; i++) {
                var obj = List[i];

                var authorid = 0;
                if (obj.authors != undefined && obj.authors[0] != undefined) {
                    authorid = getAuthorId(myBooksList, obj.title, obj.authors[0].replace(/\s/g, '').toLowerCase());
                }

                var valueToPush = {}; 

                valueToPush["id"] = obj.id;
                if (obj.title != undefined)
                {
                    valueToPush["title"] = obj.title;
                }
                else
                {
                    valueToPush["title"] = 'No title listed';
                }                

                if (obj.authors != undefined && obj.authors[0] != undefined)
                {
                    valueToPush["author"] = obj.authors[0];
                }
                else
                {
                    valueToPush["author"] = 'Author Unknown';
                }

                if (obj.publishedDate != undefined && obj.publishedDate.substring(0, 4) != undefined) {
                    valueToPush["copyright"] = obj.publishedDate.substring(0, 4);
                }
                else
                {
                    valueToPush["copyright"] = 0000;
                }

                valueToPush["author_id"] = authorid;

                valueToPush["description"] = obj.description;

                if (obj.industryIdentifiers != undefined && obj.industryIdentifiers[0] != undefined) {
                    var isbn;
                    if (obj.industryIdentifiers[0].type == 'ISBN_13') {
                        isbn = obj.industryIdentifiers[0].identifier;
                    }
                    else if (obj.industryIdentifiers[1] != undefined) {
                        isbn = obj.industryIdentifiers[1].identifier;
                    }
                    else
                    {
                        isbn = obj.industryIdentifiers[0].identifier;
                    }
                    valueToPush["isbn"] = isbn;
                }
                else
                {
                    valueToPush["isbn"] = '';
                }

                valueToPush["pages"] = obj.pageCount;

                valueToPush["thumbnail"] = obj.thumbnail;

                valueToPush["link"] = obj.link;

                data.push(valueToPush);
            }

            var params = { data: data };
            response.render('pages/results', params);

        }
    });
}

function getBookList(param, callback) {

    books.search(param, defaultOptions, function (error, results) {
        if (!error) {
            //console.log(results);
            callback(null, results);
        } else {
            console.log(error);
        }
    });
} 

function getBooksFromDb(param, callback) {
    //console.log("Getting person from DB with id: " + id);
    //var type = request.query.type;

    var sql = "";
    var params;
    switch (type) {
        case 'title':
            params = [param];
            sql = "SELECT b.title, b.author_id, lower(a.first_name || COALESCE('' || a.middle_name,'') || '' || a.last_name) author from book b inner join author a on b.author_id = a.author_id WHERE b.title Ilike $1::VARCHAR(100) || '%'";
            break;
        case 'author':
            params = [param.replace(/\s/g, '').toLowerCase()];
            sql = "SELECT b.title, b.author_id, lower(a.first_name || COALESCE('' || a.middle_name,'') || '' || a.last_name) author from book b inner join author a on b.author_id = a.author_id where lower(a.first_name || COALESCE('' || a.middle_name,'') || '' || a.last_name) = $1::VARCHAR(150)";
            break;
        case 'isbn':
            params = [param];
            sql = "SELECT b.title, b.author_id, lower(a.first_name || COALESCE('' || a.middle_name,'') || '' || a.last_name) author from book b inner join author a on b.author_id = a.author_id WHERE b.isbn = $1::VARCHAR(50)";
            break;
        default:
            params = [param.replace(/\s/g, '').toLowerCase()];
            sql = "SELECT b.title, b.author_id, lower(a.first_name || COALESCE('' || a.middle_name,'') || '' || a.last_name) author from book b inner join author a on b.author_id = a.author_id where lower(a.first_name || COALESCE('' || a.middle_name,'') || '' || a.last_name) = $1::VARCHAR(150)";
    }

    pool.query(sql, params, function (err, myResults) {
        // If an error occurred...
        if (err) {
            console.log("Error in query: ")
            console.log(err);
            callback(err, null);
        }

        // Log this to the console for debugging purposes.
        //console.log("Found result: " + JSON.stringify(myResults.rows));

        // (The first parameter is the error variable, so we will pass null.)
        callback(null, myResults.rows);
    });
}

function getAuthorId(myBooksList, title, author)
{
    var author_id = 0;    

    for (var i = 0; i < myBooksList.length; i++) {
        var myAuthor = myBooksList[i].author;
        if (myBooksList[i].title == title && myAuthor == author)
            author_id = myBooksList[i].author_id;
    }

    return author_id;
}

function insertBook(request, response) {
    var result = { success: false };

    var author_id = 0;
    var title = request.body.title;
    var author = request.body.author;
    var copyright = request.body.copyright;
    var isbn = request.body.isbn;
    var pages = request.body.pages;
    var description = request.body.description;
    var genre_id = 8; // Unknown
    var format_id = 3; //Paperback
    var is_series = false;
    var series_id = 0;
    var number_in_series = 0;
    var book_id = 0;
    var param = [author.replace(/\s/g, '').toLowerCase()];
    var bTest = false;
    var first_name = "";
    var middle_name = "";
    var last_name = "";
    
    getAuthorIdFromDB(param, function (error, result) {
        bTest = true;
        if (error || result == null) {
            response.status(500).json({
                success: false,
                data: error
            });
        } else {
            bTest = true;
            if (result[0] != null || result[0] != undefined)
            {
                author_id = result[0].author_id;

                //var first_name = "";
                //var middle_name = "";
                //var last_name = "";
                bTest = true;
                if (author_id > 0)
                {
                    var params = {
                        author_id: author_id,
                        genre_id: genre_id,
                        format_id: format_id,
                        is_series: is_series,
                        series_id: series_id,
                        number_in_series: number_in_series,
                        title: title,
                        isbn: isbn,
                        pages: pages,
                        copyright: copyright,
                        description: description
                    };

                    insertNewBook(params, function (error, result) {
                        if (error || result == null) {
                            response.status(500).json({
                                success: false,
                                data: error
                            });
                        } else {
                            if (result[0] != null || result[0] != undefined) {
                                book_id = result[0].book_id;
                                result = { success: true };
                            }
                        }
                    });
                }
                bTest == true;
                if (author_id == 0) {
                    var countSpaces = author.match(/([\s]+)/g).length
                    var author_name = author.split(" ");

                    if (countSpaces == 1) {
                        first_name = author_name[0];
                        middle_name = "";
                        last_name = author_name[1];
                    }
                    else if (countSpaces >= 2) {
                        first_name = author_name[0];
                        middle_name = author_name[1];
                        last_name = author_name[2];
                    }

                    var authorParams = {
                        first_name: first_name,
                        middle_name: middle_name,
                        last_name: last_name
                    };

                    insertNewAuthor(authorParams, function (error, result) {
                        if (error || result == null) {
                            response.status(500).json({
                                success: false,
                                data: error
                            });
                        } else {
                            if (result[0] != null || result[0] != undefined) {
                                author_id = result[0].author_id

                                if (author_id > 0) {
                                    var params = {
                                        author_id: author_id,
                                        genre_id: genre_id,
                                        format_id: format_id,
                                        is_series: is_series,
                                        series_id: series_id,
                                        number_in_series: number_in_series,
                                        title: title,
                                        isbn: isbn,
                                        pages: pages,
                                        copyright: copyright,
                                        description: description
                                    };

                                    insertNewBook(params, function (error, result) {
                                        if (error || result == null) {
                                            response.status(500).json({
                                                success: false,
                                                data: error
                                            });
                                        } else {
                                            if (result[0] != null || result[0] != undefined) {
                                                book_id = result[0].book_id;
                                                result = { success: true };
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    });
                }
            }  
            if (author_id == 0 && bTest == true)
            {
                if (author_id == 0) {
                    var countSpaces = author.match(/([\s]+)/g).length
                    var author_name = author.split(" ");

                    if (countSpaces == 1) {
                        first_name = author_name[0];
                        middle_name = "";
                        last_name = author_name[1];
                    }
                    else if (countSpaces >= 2) {
                        first_name = author_name[0];
                        middle_name = author_name[1];
                        last_name = author_name[2];
                    }

                    var authorParams = {
                        first_name: first_name,
                        middle_name: middle_name,
                        last_name: last_name
                    };

                    insertNewAuthor(authorParams, function (error, result) {
                        if (error || result == null) {
                            response.status(500).json({
                                success: false,
                                data: error
                            });
                        } else {
                            if (result[0] != null || result[0] != undefined) {
                                author_id = result[0].author_id

                                if (author_id > 0) {
                                    var params = {
                                        author_id: author_id,
                                        genre_id: genre_id,
                                        format_id: format_id,
                                        is_series: is_series,
                                        series_id: series_id,
                                        number_in_series: number_in_series,
                                        title: title,
                                        isbn: isbn,
                                        pages: pages,
                                        copyright: copyright,
                                        description: description
                                    };

                                    insertNewBook(params, function (error, result) {
                                        if (error || result == null) {
                                            response.status(500).json({
                                                success: false,
                                                data: error
                                            });
                                        } else {
                                            if (result[0] != null || result[0] != undefined) {
                                                book_id = result[0].book_id;
                                                result = { success: true };
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    });
                }
            }
        }
    });

    if (book_id > 0) {
        result = { success: true };
    }

    response.json(result);    
}

function getAuthorIdFromDB(param, callback) {
    //var params = [param];
    var sql = "SELECT DISTINCT a.author_id from author a where lower(a.first_name || COALESCE('' || a.middle_name,'') || '' || a.last_name) = $1::VARCHAR(150)";

    pool.query(sql, param, function (err, result) {
        // If an error occurred...
        if (err) {
            console.log("Error in query: ")
            console.log(err);
            callback(err, null);
        }

        // Log this to the console for debugging purposes.
        //console.log("Found result: " + JSON.stringify(result.rows));

        // (The first parameter is the error variable, so we will pass null.)
        callback(null, result.rows);
    });
}

function insertNewAuthor(param, callback) {
    var params = [param.first_name, param.last_name, param.middle_name];
    var sql = "INSERT INTO author (first_name, last_name, middle_name) VALUES ($1::varchar(50), $2::varchar(50), $3::varchar(50)) RETURNING author_id";

    pool.query(sql, params, function (err, result) {
        // If an error occurred...
        if (err) {
            console.log("Error in query: ")
            console.log(err);
            callback(err, null);
        }

        // Log this to the console for debugging purposes.
        //console.log("Found result: " + JSON.stringify(result.rows));

        // (The first parameter is the error variable, so we will pass null.)
        callback(null, result.rows);
    });
}

function insertNewBook(param, callback) {
    var params = [param.author_id,
                  param.genre_id,
                  param.format_id,
                  param.is_series,
                  param.series_id,
                  param.number_in_series,
                  param.title,
                  param.isbn,
                  param.pages,
                  param.copyright,
                  param.description];

    var sql = "INSERT INTO book (author_id, genre_id, format_id, is_series, series_id, number_in_series, title, isbn, pages, copyright, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING book_id";

    pool.query(sql, params, function (err, result) {
        // If an error occurred...
        if (err) {
            console.log("Error in query: ")
            console.log(err);
            callback(err, null);
        }

        // Log this to the console for debugging purposes.
        //console.log("Found result: " + JSON.stringify(result.rows));

        // (The first parameter is the error variable, so we will pass null.)
        callback(null, result.rows);
    });
}
