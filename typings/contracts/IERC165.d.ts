/* Generated by ts-generator ver. 0.0.8 */
/* tslint:disable */

import { Contract, ContractTransaction, EventFilter } from "ethers";
import { Provider } from "ethers/providers";
import { BigNumber } from "ethers/utils";
import { TransactionOverrides } from ".";

export class IERC165 extends Contract {
  functions: {
    supportsInterface(interfaceId: string): Promise<boolean>;
  };
  filters: {};
}
