import { ControllerPrototype } from '../type.mjs';

export function Controller(prefix = ''): ClassDecorator {
  return function (target) {
    const prototype: ControllerPrototype = target.prototype;
    prototype.prefix = prefix;
  };
}
export { commonParamGen } from './util.mjs';
export { commonMethodGen } from './util.mjs';
export { setRouterOptionMap } from './util.mjs';
export { Head } from './method.mjs';
export { Patch } from './method.mjs';
export { Options } from './method.mjs';
export { Delete } from './method.mjs';
export { Put } from './method.mjs';
export { Post } from './method.mjs';
export { Get } from './method.mjs';

export { Reg } from './validate.mjs';
export { Required } from './validate.mjs';
export { Query } from './param.mjs';
export { Header } from './param.mjs';
export { Body } from './param.mjs';
export { Param } from './param.mjs';
export { UserId } from './session.mjs';
export { Session } from './session.mjs';
