const Benchmark = require('benchmark')
const sq = require('../src')()

const compare = (...queries) => {
  const suite = new Benchmark.Suite()
  queries.forEach(({ name, qry }) => {
    suite.add(name, function() {
      qry.qry
    })
  })
  suite
    .on('cycle', function(event) {
      console.log(String(event.target))
    })
    .on('complete', function() {
      console.log('Fastest is ' + this.filter('fastest').map('name'))
    })
    .run({ async: true })
}

compare(
  {
    name: 'sq.whr`age = ${7}`',
    qry: sq.whr`age = ${7}`
  },
  {
    name: 'sq.whr({ age: 7})',
    qry: sq.whr({ age: 7 })
  },
  {
    name: "sq.whr`age = ${7} and name = ${'Jo'}`",
    qry: sq.whr`age = ${7} and name = ${'Jo'}`
  },
  {
    name: "sq.whr({ age: 7, name: 'Jo' })",
    qry: sq.whr({ age: 7, name: 'Jo' })
  }
)
