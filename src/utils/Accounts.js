import { BigNumber } from '@ethersproject/bignumber';
import { decodeBase64, PublicKey, encodeBase16, Keys } from 'casper-client-sdk';

/**
 * PublicKey casper nomenclature:
 * - public key = base16 hex => algo prefix + public key hex
 * - account hash - internal representation of a public key with a fixed length
 *
 * base16 hex: '01deba7173738a7f55de3ad9dc27e081df41ff285f25887ec424a8a65b43d0cf77'
 * base64 "2qdt4zi/b/uagi2L9Y+db0I0Jt62CTpR/Td9HhiRAu0="
 *
 * ED = 01 public keys should be 66 chars long (with the prefix)
 * SEC = 02 public keys should be 68 chars long (with the prefix)
 */

export interface AccountResult {
  publicKey: string;
  accountHash: string;
  balance: BigNumber | null;
}

type Input = { base64: string } | { publicKeyHex: string };
export const AccountModel = (input: Input) => {
  const getRawPublicKey = () => {
    let value: PublicKey;
    if ('publicKeyHex' in input) {
      value = PublicKey.fromHex(input.publicKeyHex);
    } else if ('base64' in input) {
      // TODO: signer account will always use fromEd25519 because there is on signature type available
      const bytes = decodeBase64(input.base64);
      value = PublicKey.fromEd25519(bytes);
    } else {
      throw Error('missing account key');
    }
    return value;
  };

  const getPublicKey = () => {
    // toAccountHex => sig key prefix + base16 (hex) hash
    return getRawPublicKey().toAccountHex();
  };

  const getAccountHash = () => {
    // toAccountHash => raw hash
    return encodeBase16(getRawPublicKey().toAccountHash());
  };

  return {
    getPublicKey: getPublicKey,
    getAccountHash: getAccountHash,
  };
};
