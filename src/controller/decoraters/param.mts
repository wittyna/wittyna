import { commonParamGen } from './util.mjs';
import { ParamType } from '../enum.mjs';

export function Param(name = ''): ParameterDecorator {
  return commonParamGen(name, ParamType.PARAM);
}

export function Body(name = ''): ParameterDecorator {
  return commonParamGen(name, ParamType.BODY);
}

export function Header(name = ''): ParameterDecorator {
  return commonParamGen(name, ParamType.HEADER);
}

export function Query(name = ''): ParameterDecorator {
  return commonParamGen(name, ParamType.QUERY);
}
