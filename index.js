

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

// Quantos endereços derivar da seed
const addressToView = 10000

// Qual bloco começa analisar
const initialBlock = 52128086

// Contrato USDT
const contractAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

const seed =  'your seed here please lol'


const utils = hdWallet.utils
var addressesToAnalyse = []

// Aqui vai derivar todos endereços e salvar na memória do aplicativo
async function saveAddressToMemory(){ 
    for(var wallet = 0; wallet < addressToView; wallet++) {
        let account = await utils.getAccountAtIndex(seed, wallet);
        addressesToAnalyse.push(account.address)
    }
    console.log(addressesToAnalyse)
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

// Função para pegar último bloco do disco
function getLatestLocalBlock() {
    if (!fs.existsSync('latestBlock.log')) return initialBlock
    return fs.readFileSync('latestBlock.log').toString()
}

// Funcao para salvar bloco atual no disco
function setLatestLocalBlock(number) {
    return fs.writeFileSync('latestBlock.log', number.toString())
}

// Funcao para ler o bloco atual
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
            only_confirmed:true,
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



async function onReceiveTransfer(txid, valor, toaddress) {
    // Aqui importante.. Verifica se o endereço que movimentou é nosso endereço
    if(addressesToAnalyse.includes(toaddress)) {
        console.log('O endereço recebeu uma transação: ' , txid, ' | Valor: ', valor, ' | TXID: ', txid);
        await axios.get(`https://api.yourwebhook.com/Webbook/${txid}/${valor}/${txid}`)                    
    }
}



