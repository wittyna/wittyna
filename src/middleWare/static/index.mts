import koaStatic from 'koa-static';
import Koa from 'koa';
import { Method } from '../../controller/enum.mjs';

export function staticMiddleWare({
  root,
  pathPrefix,
  ignorePathPrefix,
}: {
  root: string;
  pathPrefix?: string;
  ignorePathPrefix?: string;
}): Koa.Middleware {
  const static_ = koaStatic(root);
  return async (ctx, next) => {
    if (ignorePathPrefix && ctx.request.url.startsWith(ignorePathPrefix)) {
      return next();
    }
    if (
      ctx.method.toLowerCase() === Method.GET &&
      (!pathPrefix || ctx.request.url.startsWith(pathPrefix))
    ) {
      // 如果是文件夹，重定向到文件夹下的 index.html
      if (
        ctx.request.path &&
        ctx.request.path.indexOf('.') === -1 &&
        !ctx.request.path.endsWith('/')
      ) {
        ctx.redirect(ctx.request.path + '/' + ctx.request.search);
        return;
      }
      return static_(ctx, async () => {
        return undefined;
      });
    }
    return next();
  };
}
