const fs = require('fs')
const { ethers } = require('ethers')
const { parseArgs } = require('node:util')
const { CallData, ec, hash } = require('starknet')
const bip39 = require('@scure/bip39')
const { wordlist } = require('@scure/bip39/wordlists/english')

const CLASS_HASH = '0x033434ad846cdd5f23eb73ff09fe6fddd568284a0fb7d1be20ee482f044dabe2'
const PROXY_CLASS_HASH = '0x25ec026985a3bf9d0cc1fe17326b245dfdc3ff89b8fde106542a3ea56c5a918'

function gen_wallet() {
  const mnemonic = bip39.generateMnemonic(wordlist)
  const wallet = ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase(mnemonic), `m/44'/60'/0'/0/0`)

  const hdNode = ethers.HDNodeWallet.fromSeed(wallet.privateKey)
  const starknetHdNode = hdNode.derivePath(`m/44'/9004'/0'/0/0`)

  const privateKey = '0x' + ec.starkCurve.grindKey(starknetHdNode.privateKey).padStart(64, '0')
  const publicKey = ec.starkCurve.getStarkKey(privateKey)

  const constructorCallData = CallData.compile({
    implementation: CLASS_HASH,
    selector: hash.getSelectorFromName('initialize'),
    calldata: CallData.compile({ signer: publicKey, guardian: '0' }),
  })
  const address = '0x' + hash.calculateContractAddressFromHash(
    publicKey, PROXY_CLASS_HASH, constructorCallData, 0).substring(2).padStart(64, '0')

  return { mnemonic, address, privateKey }
}

function main() {
  const { values: args } = parseArgs({ options: {
      num: { type: 'string', default: '10', short: 'n' },
      sep: { type: 'string', default: ',', short: 's'},
      output: { type: 'string', short: 'o' }
    }})

  const num = Number(args.num)
  if (isNaN(num) || num < 0) {
    throw new Error(`Invalid num: ${num}`)
  }
  const sep = args.sep === '\\t' ? '\t' : args.sep
  const outputStream = !!args.output ? fs.createWriteStream(args.output) : process.stdout

  for (let i = 0; i < num; i++) {
    const w = gen_wallet()
    outputStream.write(`${w.mnemonic}${sep}${w.address}${sep}${w.privateKey}\n`)
  }

  if (!!args.output) {
    outputStream.end()
  }
}

main()