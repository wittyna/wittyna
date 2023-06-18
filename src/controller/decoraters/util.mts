import { ControllerPrototype, DataType, RouterOption } from '../type.mjs';
import { Method, ParamType } from '../enum.mjs';

export function setRouterOptionMap(
  prototype: ControllerPrototype,
  name: string,
  option: RouterOption
) {
  if (!prototype.routerOptionMap) {
    prototype.routerOptionMap = {};
  }
  if (!prototype.routerOptionMap[name]) {
    prototype.routerOptionMap[name] = option;
  } else {
    if (!option.params) {
      option.params = [];
    }
    if (!prototype.routerOptionMap[name].params) {
      prototype.routerOptionMap[name].params = [];
    }
    for (const param of option.params) {
      const find = prototype.routerOptionMap[name].params!.find(
        (one) => one.index === param.index
      );
      if (find) {
        if (!find.validates || !param.validates) {
          Object.assign(find, param);
        } else {
          find.validates.unshift(...param.validates);
          Object.assign(find, { ...param, validates: find.validates });
        }
      } else {
        if (param.type) {
          prototype.routerOptionMap[name].params!.push(param);
        }
      }
    }
    option.params = prototype.routerOptionMap[name].params;
    Object.assign(prototype.routerOptionMap[name], option);
  }
}

export function commonMethodGen(path = '', method: Method): MethodDecorator {
  return function (
    prototype: ControllerPrototype,
    propertyKey,
    descriptor
  ): void {
    setRouterOptionMap(prototype, propertyKey as string, {
      path,
      method,
      cb: descriptor.value as (...args: unknown[]) => Promise<unknown>,
      params: Reflect.getMetadata(
        'design:paramtypes',
        prototype,
        propertyKey
      ).map((type: DataType, index: number) => {
        return {
          index,
          dataType: type,
        };
      }),
    });
  } as MethodDecorator;
}

export function commonParamGen(
  param: string,
  type: ParamType
): ParameterDecorator {
  return function (
    prototype: ControllerPrototype,
    propertyKey,
    parameterIndex
  ) {
    setRouterOptionMap(prototype, propertyKey as string, {
      params: [
        {
          index: parameterIndex,
          param,
          type,
        },
      ],
    });
  } as ParameterDecorator;
}
