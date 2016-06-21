---
title: Node sql-fixtures (a new module)
author: Matt
date: 2014-10-16
template: article.jade
---
I don't think a fixture generator for PostgreSQL exists in NPM. If one does, I could not find it. So I went ahead and [made one](https://github.com/city41/node-sql-fixtures). Added bonus, it works with MySQL, MariaDB and sqlite as well.

<span class="more"></span>

## Fixtures?

"Fixture" is just a fancy word for "sample data". I first encountered the idea of fixtures in Ruby on Rails almost a decade ago (egads!). Typically in Ruby you lay out some sample data using YAML, and this data then gets populated into your database. This is ideal for integration tests, dummy data and end-to-end tests.

## SQL Fixtures for Node

[sql-fixtures](https://github.com/city41/node-sql-fixtures) applies the same idea, except this time for Node. Since JavaScript is such a flexible language, no need for something like YAML, it's easy to just define the fixture data in JavaScript itself.

For example, here's how to populate some data in a Users table in your database:

```javascript
var fixtures = {
  Users: [{
    username: 'Henry'
  }, {
    username: 'Catherine'
  }]
};

var sqlFixtures = require('sql-fixtures');

sqlFixtures.create(databaseConfig, fixtures).then(function(result) {
  // the Users table now has two more rows in it
  // result returns what got created,
  // so you can make use of the data in your tests
  console.log(result.Users[0].username); // Henry
  console.log(result.Users[0].id);       // the id the db generated
  console.log(result.Users[1].username); // Catherine
});
```

The `databaseConfig` parameter tells sql-fixtures how to connect to your database, more info on that in the [README](https://github.com/city41/node-sql-fixtures/blob/master/README.md)

## Foreign Key Resolution

The neatest feature of sql-fixtures is automatic foreign key resolution. If you want to insert data into two tables and have their keys point at each other, it can be tedious to do manually. With sql-fixtures you can specify the relation in the fixture spec:

```javascript
var fixtures = {
  Users: {
    username: 'Henry'
  },
  Purchase: {
    purchaseDate: new Date(),
    userId: "Users:0"
  }
};

sqlFixtures.create(databaseConfig, fixtures).then(function(result) {
  console.log(result.Purchase[0].userId === result.Users[0].id); // true
});
```

In the above, sql-fixtures will create the User row first, then circle back and populate `Purchase.userId` with Henry's actual id before adding the new row in the Purchase table.

The default is to use indices to indicate which record you want to point to, but you can also use a `specId`. This is useful if you're generating a lot of data or complex data, as keeping track of which index is which can get tedious:

```javascript
var fixtures = {
  Users: {
    username: 'Henry',
    specId: 'mySpecialUser'
  },
  Purchase: {
    purchaseDate: new Date(),
    userId: "Users:mySpecialUser"
  }
};
```

and with the specId, the association is made just like when using an index.

## That's it!

Not much to this one. And a shout out to [Knex.js](http://knexjs.org/) which is the library that sql-fixtures uses to communicate with the database. I'm a fan of Knex.js and the ORM built on top of it, [Bookshelf.js](http://bookshelfjs.org/).

### By the way
Knex.js is why I make the claim this works with Postgres, MySql, Maria and sqlite, as Knex.js supports all of them. However, I only need Postgres so far, so Postgres is the only database that's seen any real usage. If you use sql-fixtures with one of the other database engines, let me know if you hit any problems.
