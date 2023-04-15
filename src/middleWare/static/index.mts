import koaStatic from 'koa-static';
import Koa from 'koa';
import { Method } from '../../controller/enum.mjs';

export function staticMiddleWare({
  root,
  path,
}: {
  root: string;
  path?: string | RegExp;
}): Koa.Middleware {
  const static_ = koaStatic(root);
  return async (ctx, next) => {
    if (
      (ctx.method.toLowerCase() === Method.GET &&
        typeof path === 'string' &&
        ctx.request.url.startsWith(path)) ||
      (path instanceof RegExp && path.test(ctx.request.url))
    ) {
      // 如果是文件夹，重定向到文件夹下的 index.html
      if (
        ctx.request.path.indexOf('.') === -1 &&
        !ctx.request.path.endsWith('/')
      ) {
        ctx.redirect(ctx.request.path + '/' + ctx.request.search);
        return;
      }
      return static_(ctx, async () => {});
    }
    return next();
  };
}
