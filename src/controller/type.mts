import { Method, ParamType } from './enum.mjs';

export interface ControllerPrototype {
  prefix: string;
  routerOptionMap: {
    [functionName: string]: RouterOption;
  };
}

export interface RouterOption {
  path?: string;
  method?: Method;
  cb?: (...args: unknown[]) => Promise<unknown>;
  params?: RouterParam[];
}

export interface RouterParam {
  index: number;
  type?: ParamType;
  dataType?: DataType;
  param?: string;
  validates?: Validate[];
}

export type DataType =
  | typeof Number
  | typeof String
  | typeof Boolean
  | typeof Object;

export interface Validate {
  type: ValidateType;
  [ValidateType.REQUIRED]?: ValidateTypeDetail<boolean>;
  [ValidateType.REG]?: ValidateTypeDetail<RegExp>;
  message?: string;
}

export enum ValidateType {
  REQUIRED = 'required',
  REG = 'reg',
}

export interface ValidateTypeDetail<T> {
  value?: T;
  path?: string;
}

export interface ControllerInterface {
  [name: string]: (...args: unknown[]) => Promise<unknown>;
}
