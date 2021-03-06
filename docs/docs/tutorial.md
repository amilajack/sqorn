---
id: tutorial
title: Tutorial
sidebar_label: Tutorial
---

## Setup

### Install

Use npm to install Sqorn and your preferred database library.

```sh
npm install --save sqorn
npm install --save pg # postgres is the only database currently supported
```


### Initialize

Create a query building instance connected to your database. Here, we connect to a local Postgres server:

```javascript
const sq = require('sqorn')({
  pg: {
    connectionString: 'postgresql://postgres@localhost:5432/postgres'
  }
})
```

`sq` is the query-building interface. It has methods for building and executing SQL queries. 

Query-building methods are chainable. They return an new, updated, immutable query-building instance. All methods can be called as either regular functions or as template literal tags.

Execution methods return a Promise for results. 

## Manual Queries

Construct a query manually with `sq.l`. 

```js
const minAge = 20, maxAge = 30
const getPeople = sq.l`select * from person where age >= ${minAge} and age < ${maxAge}`
```

Sqorn compiles this to a parameterized query safe from SQL injection. `.qry` returns the compiled query object.

```js
getPeople.qry

{ txt: 'select * from person where age >= $1 and age < $2',
  arg: [20, 30] }
```

Execute the query and get back a Promise for all result rows with `.all`. The query builder is itself *thenable* so `.all` is optional. The following all print an array of people in the database.

```js
getPeople.all().then(people => console.log(people))
getPeople.then(people => console.log(people))
console.log(await getPeople.all())
console.log(await getPeople)
```

Call `.one` to fetch only the first result, or `undefined` if there are no matching results. The following all print the first person (or `undefined`).

```js
getPeople.one().then(person => console.log(person))
getPeople.all().then(people => console.log(people[0])
console.log(await getPeople.one())
console.log((await getPeople)[0])
```

When you need a raw unparameterized argument, prefix it with `$`.

```js
sq.l`select * from $${'test_table'}`.qry

{ txt: 'select * from test_table',
  arg: [] }
```

`sq.l` also accepts a raw sql string argument.

```js
sq.l('select * from person where age >= 20 and age < 30').qry

{ txt: 'select * from person where age >= 20 and age < 30',
  arg: [] }
```

When called multiple times, `sq.l` results are joined together with spaces.

```js
sq.l`select * from person`.l`where age >= ${20}`.l`and age < ${30}`.qry

{ txt: 'select * from person where age >= $1 and age < $2',
  arg: [20, 30] }
```

## Select Queries

### From

The simplest `select` query gets all rows from a table. Specify a `from` clause with `.frm`.

```js
sq.frm`book`.qry

{ txt: 'select * from book',
  arg: [] }
```

`.frm` also accepts raw string arguments. To prevent SQL injection, do not pass user-provided table names.

```js
sq.frm('book', 'author').qry

{ txt: 'select * from book, author',
  arg: [] }
```

The argument may be a joined table.

```js
sq.frm`book left join author on book.author_id = author.id`.qry

{ txt: 'select * from book left join author on book.author_id = author.id',
  arg: [] }
```

Only the last call to `.frm` is used.

```js
sq.frm`book`.frm`person`.qry

{ txt: 'select * from person',
  arg: [] }
```



### Where

Filter result rows by adding a `where` clause with `.whr`.

```js
sq.frm`book`.whr`genre = ${'Fantasy'}`.qry

{ txt: 'select * from book where genre = $1',
  arg: ['Fantasy'] }
```

Multiple `.whr` calls are joined with `and`.

```js
sq.frm`book`.whr`genre = ${'Fantasy'}`.whr`year = ${2000}`.qry

{ txt: 'select * from book where genre = $1 and year = $2',
  arg: ['Fantasy', 2000] }
```

It is sometimes easier to specify conditions with an object.

```js
sq.frm`book`.whr({ genre: 'Fantasy', year: 2000 }).qry

{ txt: 'select * from book where genre = $1 and year = $2',
  arg: ['Fantasy', 2000] }
```

By default keys are converted from `CamelCase` to `snake_case`.

```js
sq.frm`person`.whr({ firstName: 'Kaladin' }).qry

{ txt: 'select * from person where first_name = $1',
  arg: ['Kaladin'] }
```

If you need a non-equality condition, add a property whose value is created with `sq.l`. the property's key will be ignored.

```js
const condMinYear = sq.l`year >= ${20}`
const condMaxYear = sq.l`year < ${30}`
sq.frm`person`.whr({ condMinYear, condMaxYear }).qry

{ txt: 'select * from person where year >= $1 and year < $2',
  arg: [20, 30] }
```

Multiple objects passed to `.whr` are joined with `or`.

```js
sq.frm`person`.whr({ name: 'Rob' }, { name: 'Bob' }).qry

{ txt: 'select * from person where name = $1 or name = $2',
  arg: ['Rob', 'Bob'] }
```

[Advanced Queries - Where](#where-1) explains how to build complex `where` conditions.

### Returning

Specify selected columns with `.ret`.

```js
sq.frm`book`.ret`title, author`.qry

{ txt: 'select title, author from book',
  arg: [] }
```

`.ret` also accepts raw string arguments. To prevent SQL injection, do not pass user-provided column names.

```js
sq.frm`book`.ret('title', 'author').qry

{ txt: 'select title, author from book',
  arg: [] }
```

Only the last call to `.ret` is used.

```js
sq.frm`book`.ret('title', 'author').ret`id`.qry

{ txt: 'select title, author, id from book',
  arg: [] }
```

### Express Syntax

The first, second, and third calls of `sq` are equivalent to calling `.frm`, `.whr`, and `.ret` respectively.

The following are sets of equivalent queries:

```js
const name = 'Dalinar'

sq`person`
sq('person')
sq.frm`person`

sq`person``name = ${name}`
sq`person`({ name })
sq.frm`person`.whr`name = ${name}`

sq`person``name = ${name}``age`
sq.frm`person`.whr`name = ${name}`.ret`age`
sq.frm('person').whr({ name }).ret('age')
```

### Having

### Group By

### Limit

### Offset

## Manipulation Queries

### Delete

`Delete` queries look like `Select` queries with an additional call to `.del`.

```js
sq.frm`person`.del.qry
sq.del.frm`person`.qry // equivalent

{ txt: 'delete from person',
  arg: [] }
```

Filter the rows to delete with `.whr`

```js
sq.frm`person`.whr`id = ${723}`.del.qry

{ txt: 'delete from person where id = $1',
  arg: [723] }
```

Return the deleted rows with `.ret`

```js
sq.frm`person`.ret`name`.del.qry

{ txt: 'delete from person returning name',
  arg: [] }
```

[Express syntax](#express-syntax) works too.

```js
sq`person`({ job: 'student' })`name`.del.qry

{ txt: 'delete from person where job = $1 returning name',
  arg: ['student'] }
```

`.del` is idempotent.

```js
sq`book`.del.del.del.qry

{ txt: 'delete from book',
  arg: [] }
```

### Insert

`Insert` queries use `.ins` and `.val` to specify the columns and values to insert.

```js
sq.frm`person`
  .ins`first_name, last_name`
  .val`${'Shallan'}, ${'Davar'}`
  .val`${'Navani'}, ${'Kholin'}`
  .qry

{ txt: 'insert into person (first_name, last_name) values ($1, $2), ($3, $4)',
  arg: ['Shallan', 'Davar', 'Navani', 'Kholin'] }
```

You can pass `.ins` column names as strings. You must then pass`.val` corresponding row values. `null` values are inserted as `NULL` while `undefined` values are inserted as `DEFAULT`.

```js
sq.frm`book`
  .ins('title', 'year')
  .val('The Way of Kings', years[0])
  .val('Words of Radiance', null)
  .val('Oathbringer')
  .qry

{ txt: 'insert into book (title, year) values ($1, $2), ($3, NULL), ($4, DEFAULT)',
  arg: ['The Way of Kings', 2010, 'Words of Radiance', 'Oathbringer'] }
```

When called as a template string or passed string column names, `.ins` may only be called once.

When passed an object, `.ins` can be called multiple times to insert multiple rows. Column names are inferred from examining all object keys.

```js
sq.frm`book`
  .ins({ title: 'The Way of Kings', year: 2010 })
  .ins({ title: 'Words of Radiance', year: null })
  .ins({ title: 'Oathbringer' })
  .qry

{ txt: 'insert into book (title, year) values ($1, $2), ($3, NULL), ($4, DEFAULT)',
  arg: ['The Way of Kings', 2010, 'Words of Radiance', 'Oathbringer'] }
```

Alternatively, multiple objects may be passed to `.ins`

```js
sq.frm`book`
  .ins({ title: 'The Way of Kings', year: 2010 },
       { title: 'Words of Radiance', year: null },
       { title: 'Oathbringer' })
  .qry

{ txt: 'insert into book (title, year) values ($1, $2), ($3, NULL), ($4, DEFAULT)',
  arg: ['The Way of Kings', 2010, 'Words of Radiance', 'Oathbringer'] }
```

`.ret` specifies the returning clause. [Express syntax](#express-syntax) may be used to specify `.frm` and `.ret`.

```js
sq.frm`book`.ins({ title: 'Squirrels and Acorns' }).ret`id`.qry
sq`book`()`id`.ins({ title: 'Squirrels and Acorns' }).qry

{ txt: 'insert into book (title) values ($1) returning id',
  arg: ['Squirrels and Acorns'] }
```

### Update

`Update` queries use `.set` to specify values to update. `.set` can be called multiple times.

```js
sq.frm`person`.set`age = age + 1, processed = true`.set`name = ${'Sally'}`.qry

{ txt: 'update person set age = age + 1, processed = true, name = $1',
  arg: ['Sally'] }
```

`.set` also accepts an update object.

```js
sq.frm`person`
  .whr({ firstName: 'Matt' })
  .set({ firstName: 'Robert', nickname: 'Rob' })
  .qry

{ txt: 'update person set first_name = $1, nickname = $2 where first_name = $3',
  arg: ['Robert', 'Rob', 'Matt'] }
```
[Express syntax](#express-syntax) works too.

```js
sq`person`({ firstName: 'Rob' })`id`.set({ firstName: 'Robert'}).qry

{ txt: 'update person set first_name = $1 where first_name = $2 returning id',
  arg: ['Robert', 'Rob'] }
```

Call `.set` multiple times to update additional columns.

```js
sq.frm`person`
  .whr({ firstName: 'Matt' })
  .set({ firstName: 'Robert' })
  .set({ nickname: 'Rob' })
  .qry

{ txt: 'update person set first_name = $1, nickname = $2 where first_name = $3',
  arg: ['Robert', 'Rob', 'Matt'] }
```

### Upsert

## Composing Queries

### Subqueries

### With (CTEs)



### sq.ext

## Complex Clauses

### Where

### Join

`.jni`, `.jnf`, `.jnl`, `.jnr`, `.jnn`, `.jnc`
`.ijn`, `.fjn`, `.ljn`, `.rjn`, `.njn`, `.cjn`

#### (Inner) Join

`.jni` takes a table to join and returns a function that expects a `where` condition to join on.

```js
sq.frm`book`
  .inj`author`.on`book.author_id = author.id`
  .whr`book.title = ${'OathBringer'}`
  .ret`author.first_name, author.last_name`
```



#### Full (Outer) Join

#### Left (Outer) Join

#### Right (Outer) Join

#### Natural Join

#### Cross Join


## Transactions

`.trx` starts a transaction. It can be called in two ways:

### Transaction Callback

The easiest way to execute queries within a transaction is to pass `.trx` an asynchronous callback. If any query within the callback fails, all will be rolled back.

Make sure to pass all queries the transaction object `trx` or they won't be executed in the context of the transaction.

```js
await sq.trx(async trx => {
  const { id } = await Account.ins({ email: 'jo@jo.com' }).one(trx)
  await Authorization.ins({ accountId: id, password: 'secret' }).run(trx)
})
```

### Transaction Value

If you need more flexibility, call `.trx` without any arguments and it will return a transaction object `trx`.

Pass `trx` to a query to add it to a transaction. When you're done, call `trx.commit()`. If there is an error, call `trx.rollback()`.

```js
let trx
try {
  trx = await sq.trx()
  const { id } = await Account.ins({ email: 'jo@jo.com' }).one(trx)
  await Authorization.ins({ accountId: id, password: 'secret' }).run(trx)
  await trx.commit()
} catch (error) {
  await trx.rollback()
}
```
