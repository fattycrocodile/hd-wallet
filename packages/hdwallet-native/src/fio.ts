import * as core from "@shapeshiftoss/hdwallet-core";
import * as fio from "fiosdk-offline";
import fetch, { RequestInfo, RequestInit } from "node-fetch";
import { NativeHDWalletBase } from "./native";

const fetchJson = async (uri: RequestInfo, opts?: RequestInit) => {
  return fetch(uri, opts);
};

export function MixinNativeFioWalletInfo<TBase extends core.Constructor>(Base: TBase) {
  return class MixinNativeFioWalletInfo extends Base implements core.FioWalletInfo {
    _supportsFioInfo = true;

    async fioSupportsNetwork(): Promise<boolean> {
      return true;
    }

    async fioSupportsSecureTransfer(): Promise<boolean> {
      return false;
    }

    fioSupportsNativeShapeShift(): boolean {
      return false;
    }

    fioGetAccountPaths(msg: core.FioGetAccountPaths): Array<core.FioAccountPath> {
      return [
        {
          addressNList: [0x80000000 + 44, 0x80000000 + 235, 0x80000000 + msg.accountIdx, 0, 0],
        },
      ];
    }

    fioNextAccountPath(msg: core.FioAccountPath): core.FioAccountPath {
      // Only support one account for now (like portis).
      // the fioers library supports paths so it shouldnt be too hard if we decide multiple accounts are needed
      return undefined;
    }
  };
}

export function MixinNativeFioWallet<TBase extends core.Constructor<NativeHDWalletBase>>(Base: TBase) {
  return class MixinNativeFioWallet extends Base {
    _supportsFio = true;
    baseUrl = "https://fio.eu.eosamsterdam.net/v1/";
    #mnemonic: string;

    async fioInitializeWallet(mnemonic: string): Promise<void> {
      this.#mnemonic = mnemonic;
    }

    async getFioSdk(path: string): Promise<fio.FIOSDK> {
      return this.needsMnemonic(!!this.#mnemonic, async () => {
        const { fioKey: privateKey } = await fio.FIOSDK.createPrivateKeyMnemonic(this.#mnemonic, path);
        const { publicKey } = fio.FIOSDK.derivedPublicKey(privateKey);
        return new fio.FIOSDK(privateKey, publicKey, this.baseUrl, fetchJson);
      });
    }

    async fioGetAddress(msg: core.FioGetAddress): Promise<string> {
      const sdk = await this.getFioSdk(core.addressNListToBIP32(msg.addressNList));
      return sdk.getFioPublicKey();
    }

    async fioSignTx(msg: core.FioSignTx): Promise<core.FioSignedTx> {
      const sdk = await this.getFioSdk(core.addressNListToBIP32(msg.addressNList));

      const account = msg.actions[0].account;
      const action = msg.actions[0].name;
      const data = msg.actions[0].data;

      const res = await sdk.prepareTransaction(account, action, data);

      return {
        serialized: res.packed_trx,
        signature: res.signatures[0],
      };
    }
  };
}
