import Router, { RouterParamContext } from '@koa/router';
import {
  ControllerInterface,
  ControllerPrototype,
  RouterParam,
} from './type.mjs';
import Koa from 'koa';
import { ParamType } from './enum.mjs';
import { type File as MulterFile } from '@koa/multer';
import { at, groupBy } from 'lodash-es';
import { paramValidate } from './paramValidate.mjs';
import { routerPathConcat } from '../utils/index.mjs';
import { ResponseError } from '../middleWare/index.mjs';
import { ResponseErrorType } from '../middleWare/response/Error.mjs';

export function setController(
  router: Router,
  routerPrefix = '/',
  controller: ControllerInterface
) {
  const { prefix, routerOptionMap }: ControllerPrototype =
    controller.constructor.prototype;
  for (const routerName in routerOptionMap) {
    const { method, path, cb, params } = routerOptionMap[routerName];
    router[method!](
      routerPathConcat(routerPrefix, prefix, path),
      async (context) => {
        const paramValues = getParams(params, context);
        if (params) {
          for (let i = 0; i < params!.length; i++) {
            paramValidate(paramValues[i], params![i]);
          }
        }
        return cb!.call(controller, ...paramValues, context);
      }
    );
  }
}

function getParams(
  params: RouterParam[] = [],
  context: Koa.ParameterizedContext & RouterParamContext
): unknown[] {
  return params
    .filter((one) => one.param)
    .sort((a, b) => a.index - b.index)
    .map((param) => transformByDataType(param, getParamValue(param, context)));
}
function getParamValue(
  param: RouterParam,
  context: Koa.ParameterizedContext & RouterParamContext
) {
  switch (param.type) {
    case ParamType.PARAM:
      if (param.param) {
        return context.params[param.param];
      }
      return context.params;
    case ParamType.QUERY:
      if (param.param) {
        return context.query[param.param];
      }
      return context.query;
    case ParamType.HEADER:
      if (param.param) {
        return context.headers[param.param];
      }
      return context.headers;
    case ParamType.BODY:
      const { body = {}, files = [] } = context.request as unknown as {
        body: Record<string, unknown>;
        files: MulterFile[];
      };
      if (param.param) {
        if (param.param in body) {
          return body[param.param];
        } else {
          return files.filter((file) => file.fieldname === param.param);
        }
      } else {
        return {
          ...body,
          ...groupBy(files, (file) => file.fieldname),
        };
      }
    case ParamType.SESSION:
      if (param.param) {
        return at(context.session, param.param)?.[0];
      } else {
        return context.session;
      }
  }
}

function transformByDataType(param: RouterParam, value: unknown) {
  if (value === undefined || value === null || !param.dataType) {
    return value;
  }
  try {
    switch (param.dataType) {
      case Number:
        const res = Number(value);
        if (isNaN(res)) {
          throw new Error();
        }
        return res;
      case String:
        return String(value);
      case Boolean:
        return Boolean(value);
      // 其他类型
      default:
        if (typeof value === 'string') {
          return JSON.parse(value as string);
        }
        return value;
    }
  } catch (e) {
    throw typeError(param);
  }
}

function typeError(param: RouterParam) {
  return new ResponseError({
    error: ResponseErrorType.INVALID_REQUEST,
    error_description: `${param.type} parameter error:  key: ${
      param.param || param.type
    } is not a ${param.dataType?.toString()} type`,
  });
}

export * from './index.mjs';
export * from './decoraters/index.mjs';
