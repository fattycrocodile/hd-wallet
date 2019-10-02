import {
  HDWallet,
  GetPublicKey,
  PublicKey,
  RecoverDevice,
  ResetDevice,
  Coin,
  Ping,
  Pong,
  LoadDevice,
  ETHWallet,
  ETHGetAddress,
  ETHSignTx,
  ETHGetAccountPath,
  ETHAccountPath,
  ETHSignMessage,
  ETHSignedMessage,
  ETHVerifyMessage,
  ETHSignedTx,
  DescribePath,
  PathDescription,
  addressNListToBIP32,
  BIP32Path,
  slip44ByCoin,
  Transport,
  Keyring,
  HDWalletInfo,
  ETHWalletInfo
} from "@shapeshiftoss/hdwallet-core"
      
import Web3 from 'web3'

function describeETHPath (path: BIP32Path): PathDescription {
  let pathStr = addressNListToBIP32(path)
  let unknown: PathDescription = {
    verbose: pathStr,
    coin: 'Ethereum',
    isKnown: false
  }

  if (path.length !== 5)
    return unknown

  if (path[0] !== 0x80000000 + 44)
    return unknown

  if (path[1] !== 0x80000000 + slip44ByCoin('Ethereum'))
    return unknown

  if ((path[2] & 0x80000000) >>> 0 !== 0x80000000)
    return unknown

  if (path[3] !== 0)
    return unknown

  if (path[4] !== 0)
    return unknown

  let index = path[2] & 0x7fffffff
  return {
    verbose: `Ethereum Account #${index}`,
    accountIdx: index,
    wholeAccount: true,
    coin: 'Ethereum',
    isKnown: true
  }
}

// We might not need this. Leaving it for now to debug further
class PortisTransport extends Transport {
  public getDeviceID() {
    return '0'
  }

  public call (...args: any[]): Promise<any> {
    return Promise.resolve()
  }

}

export function isPortis(wallet: HDWallet): wallet is PortisHDWallet {
  return typeof wallet === 'object' && (wallet as any)._isPortis === true
}

export class PortisHDWallet implements HDWallet, ETHWallet {
  _supportsETH: boolean = true
  _supportsETHInfo: boolean = true
  _supportsBTCInfo: boolean = false
  _supportsBTC: boolean = false
  _supportsDebugLink: boolean = false
  _isPortis: boolean = true

  transport = new PortisTransport(new Keyring())
  
  portis: any
  web3: any

  constructor(portis) {
    this.portis = portis
    this.web3 = new Web3(portis.provider);
  }

  public async isLocked(): Promise<boolean> {
    return false;
  }

  public getVendor(): string {
    return "portis"
  }

  public async getModel(): Promise<string> {
    return 'portis'
  }

  public async getLabel(): Promise<string> {
    return 'Portis'
  }

  public async initialize(): Promise<any> {
      return {}
  }

  public async hasOnDevicePinEntry(): Promise<boolean> {
    return true;
  }

  public async hasOnDevicePassphrase(): Promise<boolean> {
    return true;
  }

  public async hasOnDeviceDisplay(): Promise<boolean> {
    return true;
  }

  public async hasOnDeviceRecovery(): Promise<boolean> {
    return true;
  }

  public async hasNativeShapeShift(
    srcCoin: Coin,
    dstCoin: Coin
  ): Promise<boolean> {
    return false;
  }

  clearSession(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  ping(msg: Ping): Promise<Pong> {
    throw new Error("Method not implemented.");
  }
  sendPin(pin: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  sendPassphrase(passphrase: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  sendCharacter(charater: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  sendWord(word: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  cancel(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  public wipe(): Promise<void> {
    return Promise.resolve()
  }
  public reset(msg: ResetDevice): Promise<void> {
    return Promise.resolve()
  }
  recover(msg: RecoverDevice): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public loadDevice (msg: LoadDevice): Promise<void> {
    return this.portis.importWallet(msg.mnemonic)
  }

  public async ethSupportsNetwork (chain_id: number = 1): Promise<boolean> {
    return true
  }

  public async ethSupportsSecureTransfer (): Promise<boolean> {
    return false
  }

  public async ethSupportsNativeShapeShift (): Promise<boolean> {
    return false
  }

  public async ethVerifyMessage (msg: ETHVerifyMessage): Promise<boolean> {
    const signingAddress = await this.web3.eth.accounts.recover(msg.message, ('0x' + msg.signature), false)
    return signingAddress === msg.address
  }

  public describePath (msg: DescribePath): PathDescription {
    switch (msg.coin) {
    case 'Ethereum':
      return describeETHPath(msg.path)
    default:
      throw new Error("Unsupported path");
    }
  }

  public ethNextAccountPath (msg: ETHAccountPath): ETHAccountPath | undefined {
    // Portis only supports one account for eth
    return undefined
  }

  public async isInitialized (): Promise<boolean> {
    return false
  }

  public disconnect (): Promise<void> {
    return Promise.resolve()
  }

  // TODO this needs to handle more than just eth
  public async getPublicKeys(msg: GetPublicKey[]): Promise<PublicKey[]> {
    const portisResult = await this.portis.getExtendedPublicKey("m/44'/60'/0'")
    const { result, error } = portisResult
    if (result) {
      return [{ xpub: result }]
    }
  }

  public async ethSignTx (msg: ETHSignTx): Promise<ETHSignedTx> {
    const result = await this.web3.eth.signTransaction({
      from: await this._ethGetAddress(),
      to: msg.to,
      value: msg.value,
      gas: msg.gasLimit,
      gasPrice: msg.gasPrice,
      data: msg.data,
      nonce: msg.nonce
    })
    return {
        v: result.tx.v,
        r: result.tx.r,
        s:  result.tx.s,
        serialized: result.raw
    } 
  }

  public async ethSignMessage (msg: ETHSignMessage): Promise<ETHSignedMessage> {

    const address = await this._ethGetAddress()
    const result = await this.web3.eth.sign(msg.message, address)
    return {
      address,
      signature: result
    }
  }

  public ethGetAccountPaths (msg: ETHGetAccountPath): Array<ETHAccountPath> {
    return [{
      addressNList: [ 0x80000000 + 44, 0x80000000 + slip44ByCoin(msg.coin), 0x80000000 + msg.accountIdx, 0, 0 ],
      hardenedPath: [ 0x80000000 + 44, 0x80000000 + slip44ByCoin(msg.coin), 0x80000000 + msg.accountIdx ],
      relPath: [ 0, 0 ],
      description: "Portis"
    }]
  }

  public async ethGetAddress (msg: ETHGetAddress): Promise<string> {
    return this._ethGetAddress()
  }

  public async getDeviceID(): Promise<string> {
    return this._ethGetAddress()
  }

  private async _ethGetAddress(): Promise<string> {
    return (await this.web3.eth.getAccounts())[0]
  }

  public async getFirmwareVersion(): Promise<string> {
    return 'portis'
  }
}

export class PortisHDWalletInfo implements HDWalletInfo, ETHWalletInfo {
  _supportsBTCInfo: boolean = false
  _supportsETHInfo: boolean = true

  public getVendor (): string {
    return "Portis"
  }

  public async ethSupportsNetwork (chain_id: number = 1): Promise<boolean> {
    return chain_id === 1
  }

  public async ethSupportsSecureTransfer (): Promise<boolean> {
    return false
  }

  public async ethSupportsNativeShapeShift (): Promise<boolean> {
    return false
  }

public ethGetAccountPaths (msg: ETHGetAccountPath): Array<ETHAccountPath> {
  return [{
      addressNList: [ 0x80000000 + 44, 0x80000000 + slip44ByCoin(msg.coin), 0x80000000 + msg.accountIdx, 0, 0 ],
      hardenedPath: [ 0x80000000 + 44, 0x80000000 + slip44ByCoin(msg.coin), 0x80000000 + msg.accountIdx ],
      relPath: [ 0, 0 ],
      description: "Portis"
    }]
  }

  public async hasOnDevicePinEntry (): Promise<boolean> {
    return false
  }

  public async hasOnDevicePassphrase (): Promise<boolean> {
    return false
  }

  public async hasOnDeviceDisplay (): Promise<boolean> {
    return false
  }

  public async hasOnDeviceRecovery (): Promise<boolean> {
    return false
  }

  public async hasNativeShapeShift (srcCoin: Coin, dstCoin: Coin): Promise<boolean> {
    // It doesn't... yet?
    return false
  }

  public describePath (msg: DescribePath): PathDescription {
    switch (msg.coin) {
      case 'Ethereum':
        return describeETHPath(msg.path)
      default:
        throw new Error("Unsupported path")
      }
  }

  public ethNextAccountPath (msg: ETHAccountPath): ETHAccountPath | undefined {
    // Portis only supports one account for eth
    return undefined
  }
}

export function info () {
  return new PortisHDWalletInfo()
}

export function create (portis): PortisHDWallet {
  return new PortisHDWallet(portis)
}
