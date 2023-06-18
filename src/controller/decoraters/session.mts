import { commonParamGen } from './util.mjs';
import { ParamType } from '../enum.mjs';

export function Session(key = ''): ParameterDecorator {
  return commonParamGen(key, ParamType.SESSION);
}

export function UserId(): ParameterDecorator {
  return commonParamGen('tokenInfo.userId', ParamType.SESSION);
}
