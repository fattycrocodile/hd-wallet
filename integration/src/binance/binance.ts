import {
  bip32ToAddressNList,
  HDWallet,
  BinanceWallet,
  supportsBinance,
  BinanceTx
} from '@shapeshiftoss/hdwallet-core'
import { HDWalletInfo } from '@shapeshiftoss/hdwallet-core/src/wallet'

import * as tx01_unsigned from './tx01.unsigned.json'
import * as tx01_signed from './tx01.signed.json'

const MNEMONIC12_NOPIN_NOPASSPHRASE = 'alcohol woman abuse must during monitor noble actual mixed trade anger aisle'

const TIMEOUT = 60 * 1000

/**
 *  Main integration suite for testing BinanceWallet implementations' Cosmos support.
 */
export function binanceTests (get: () => {wallet: HDWallet, info: HDWalletInfo}): void {

  let wallet: BinanceWallet & HDWallet

  describe('Binance', () => {

    beforeAll(async () => {
      const { wallet: w } = get()
      if (supportsBinance(w))
        wallet = w
    })

    beforeEach(async () => {
      if (!wallet) return
      await wallet.wipe()
      await wallet.loadDevice({ mnemonic: MNEMONIC12_NOPIN_NOPASSPHRASE, label: 'test', skipChecksum: true })
    }, TIMEOUT)

    test('binanceGetAccountPaths()', () => {
      if (!wallet) return
      let paths = wallet.binanceGetAccountPaths({ accountIdx: 0 })
      expect(paths.length > 0).toBe(true)
      expect(paths[0].addressNList[0] > 0x80000000).toBe(true)
      paths.forEach(path => {
        expect(
          wallet.binanceNextAccountPath(path) === undefined
          || wallet.binanceNextAccountPath(path).addressNList.join() !== path.addressNList.join()
        ).toBeTruthy()
      })
    }, TIMEOUT)

    test('binanceGetAddress()', async () => {
      if (!wallet) return
      expect(await wallet.binanceGetAddress({
        addressNList: bip32ToAddressNList("m/44'/714'/0'/0/0"),
        showDisplay: false }))
        .toEqual('binance15cenya0tr7nm3tz2wn3h3zwkht2rxrq7q7h3dj')
    }, TIMEOUT)

    test('binanceSignTx()', async () => {
      if (!wallet) return

      let res = await wallet.binanceSignTx({
        tx: (tx01_unsigned as unknown) as BinanceTx,
        addressNList: bip32ToAddressNList("m/44'/714'/0'/0/0"),
        chain_id: 'binancehub-2',
        account_number: '1',
        sequence: '0'
      })
      expect(res).toEqual((tx01_signed as unknown) as BinanceTx)
    }, TIMEOUT)
  })
}
