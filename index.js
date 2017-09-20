#!/usr/bin/env node

const axios = require('axios')

console.reset = function () {
  return process.stdout.write('\033c')
}

async function main(total) {
  const [
    pricesResponse,
    exchangesResponse,
    bitwageResponse,
    commRatesResponse
  ] = await Promise.all([
    axios.get('https://api.bitvalor.com/v1/order_book_stats.json'),
    axios.get('https://api.bitvalor.com/v1/exchanges.json'),
    axios.get('https://www.bitwage.com/rates'),
    axios.get('http://api.fixer.io/latest?base=USD')
  ])

  const btcUsd = parseFloat(
    bitwageResponse.data
      .replace(/[<][^>]+[>]/g, '')
      .replace(/[\n\r]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .match(/XBTUSD\s+([\d.]+)/)[ 1 ]
  )

  const usdBrl = commRatesResponse.data.rates.BRL
  const exchanges = exchangesResponse.data
  const prices = pricesResponse.data

  const ordered = Object
    .keys(prices)
    .filter(it => ![ 'total', 'LOC', 'ARN' ].includes(it))
    .map(it => ({
      id: it,
      name: exchanges[ it ].name,
      raw: prices[ it ].bid * total
    }))
    .map(it => Object.assign(it, {
      fee:
      (exchanges[ it.id ].fees.out_BRL[ 0 ] * it.raw) +
      (exchanges[ it.id ].fees.trade_market[ 0 ] * it.raw) +
      (exchanges[ it.id ].fees.out_BRL[ 1 ])
    }))
    .map(it => Object.assign(it, {
      net: it.raw - it.fee
    }))
    .sort((a, b) => -(a.net - b.net))

  console.reset()
  console.log('\n ' + new Date().toLocaleString())
  console.log(' ---------------------------------------------------------')

  ordered.forEach(it => {
    const usdBtcBrl = it.net / (btcUsd * total)
    const spread = (100 * ((usdBtcBrl / usdBrl) - 1)).toFixed(2).padStart(6) + '%'
    const name = it.name.padStart(20)
    const btcBrl = 'R$ ' + it.net.toFixed(2)

    console.log([ name, btcBrl, usdBtcBrl.toFixed(3), spread ].join('  |  '))
  })

  setTimeout(() => main(total), 30000)
}

const total = parseFloat(process.argv.slice(2)[ 0 ] || '1')

main(total).then()
