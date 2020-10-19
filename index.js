/*
* Tron Contract Transactions Webhook
* v1.0
*/
const TronWeb = require("tronweb")
const TronGrid = require("trongrid")
const request = require('request')
const fs = require('fs')
const crypto = require('crypto')
const bip39 = require('bip39')
const bip32 = require('bip32')


const createKeccakHash = require('keccak')
const secp256k1 = require('secp256k1')


const tronWeb = new TronWeb({
  fullHost: "https://api.trongrid.io/"
})
const tronGrid = new TronGrid(tronWeb)

/* CHANGE CONTRACT ADDRESS HERE */
var contractAddress = 'TLMEQZ3ZToeAMabGYvY25WZn9b3c8nNrqS'
var currentBlock = getLatestLocalBlock()
var latestBlockOnBlockchain = currentBlock

/* latestBlock.log register last block number updated by script */
function getLatestLocalBlock() {
  if (!fs.existsSync('latestBlock.log')) return 0
  return fs.readFileSync('latestBlock.log').toString()
}

function setLatestLocalBlock(number) {
  return fs.writeFileSync('latestBlock.log', number)
}

function updateLatestBlock() {
  request({
    method: 'GET',
    url: 'https://api.trongrid.io/wallet/getnowblock'
  }, function(error, response, body) {
    if (body && !error) {
      try {
        latestBlockOnBlockchain = (JSON.parse(body).block_header.raw_data.number)
      } catch (e) {
        return false
      }
    }
  })
}


async function receiveBlock() {
  if (currentBlock >= latestBlockOnBlockchain) {
    return setTimeout(receiveBlock, 250)
  }
  console.log('Bloco: ', currentBlock, ' de ', latestBlockOnBlockchain)
  try {
    var result = await tronGrid.contract.getEvents(contractAddress, {
      block_number: currentBlock,
      event_name: "Transfer",
      limit: 200,
      order_by: "timestamp,asc"
    })
    result.data = result.data.map(tx => {
      tx.result.to_address = tronWeb.address.fromHex(tx.result.to)
      tx.result.from_address = tronWeb.address.fromHex(tx.result.from)
      return tx
    })
    for (var i in result.data) {
      if (result.data[i].caller_contract_address != contractAddress) continue
      if (result.data[i].event_name != 'Transfer') continue
      onReceiveTransfer(result.data[i].transaction_id, result.data[i].result.value, result.data[i].result.to_address)
    }
    currentBlock++
    setLatestLocalBlock(currentBlock)
  } catch (e) {
    return setTimeout(receiveBlock, 1250)
  }
  return setTimeout(receiveBlock, 250)
}



/* THIS FUNCTION IS CALLED EVERY TRANSACTION ON CONTRACT */
function onReceiveTransfer(txid, valor, toaddress) {
  console.log(valor, toaddress)
}





setInterval(updateLatestBlock, 2500)
setTimeout(receiveBlock, 2500)
