import { ControllerPrototype, ValidateType } from '../type.mjs';
import { setRouterOptionMap } from './util.mjs';

export function Required(path?: string, message?: string): ParameterDecorator {
  return function (
    prototype: ControllerPrototype,
    propertyKey,
    parameterIndex
  ) {
    setRouterOptionMap(prototype, propertyKey as string, {
      params: [
        {
          index: parameterIndex,
          validates: [
            {
              type: ValidateType.REQUIRED,
              [ValidateType.REQUIRED]: {
                value: true,
                path,
              },
              message,
            },
          ],
        },
      ],
    });
  } as ParameterDecorator;
}

export function Reg(
  reg: RegExp,
  path?: string,
  message?: string
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
          validates: [
            {
              type: ValidateType.REG,
              [ValidateType.REG]: {
                value: reg,
                path,
              },
              message,
            },
          ],
        },
      ],
    });
  } as ParameterDecorator;
}
