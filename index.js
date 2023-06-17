

/*
* Tron Contract Transactions Webhook
* v2.0
* A webhook capable of analyzing and receiving over 100,000 addresses within the TRON network.
*/

const hdWallet = require('tron-wallet-hd');
const TronWeb = require("tronweb")
const TronGrid = require("trongrid")
const request = require('request')
const fs = require('fs')
const crypto = require('crypto')
const bip39 = require('bip39')
const bip32 = require('bip32')
const axios = require('axios');

const createKeccakHash = require('keccak')
const secp256k1 = require('secp256k1')

const addressToView = 100000
const initialBlock = 52128086
const contractAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const seed =  'you seed here please'


const utils = hdWallet.utils
var addressesToAnalyse = []


async function saveAddressToMemory(){ 
    for(var wallet = 0; wallet < addressToView; wallet++) {
        let account = await utils.getAccountAtIndex(seed, wallet);
        addressesToAnalyse.push(account.address)
    }
    setInterval(updateLatestBlock, 3000)
    setTimeout(receiveBlock, 1200)
}


saveAddressToMemory()



const tronWeb = new TronWeb({
    fullHost: "https://api.trongrid.io/"
})
const tronGrid = new TronGrid(tronWeb)


var currentBlock = getLatestLocalBlock()
var latestBlockOnBlockchain = currentBlock







async function getContractEvent(block, fingerprint) {
    let requestObj = {
        block_number: block,
        event_name: "Transfer",
        only_confirmed:true,
        limit: 200,
        order_by: "timestamp,desc"
    }
    if(fingerprint) {
        requestObj.fingerprint = fingerprint
    }
    let result = await tronGrid.contract.getEvents(contractAddress, requestObj)

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

    if(result.meta && result.meta.links && result.meta.links.next) {
        console.log('O bloco: ', currentBlock, ' tem mais de 1 evento .. requisitando novamente', result)
        return getContractEvent(block, result.meta.fingerprint)
    }
}



function getLatestLocalBlock() {
    if (!fs.existsSync('latestBlock.log')) {
        console.log('Sem bloco inicial.. Começando do zero')
        return initialBlock
    }
    return fs.readFileSync('latestBlock.log').toString()
}

function setLatestLocalBlock(number) {
    try {
        fs.writeFileSync('latestBlock.log', number.toString())
    }
    catch(e) {
        console.log(e)
    }
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
        getContractEvent(currentBlock)
        currentBlock++
        setLatestLocalBlock(currentBlock) 
    } catch (e) {
        return setTimeout(receiveBlock, 2000)
    }
    return setTimeout(receiveBlock, 250)
}



/* THIS FUNCTION IS CALLED EVERY TRANSACTION ON CONTRACT */
async function onReceiveTransfer(txid, valor, toaddress) {
    if(addressesToAnalyse.includes(toaddress)) {
        console.log('O endereço recebeu uma transação: ' , toaddress, ' | Valor: ', valor, ' | TXID: ', txid);
        await axios.get(`https://api.yourwebhook.com/${toaddress}/${valor}/${txid}`)                    
    }
}



