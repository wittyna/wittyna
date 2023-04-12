import koaStatic from 'koa-static';
import Koa from 'koa'

export function staticMiddleWare({
 root,
 path,
}: {
  root: string,
  path?: string | RegExp;
}): Koa.Middleware {
  const static_ = koaStatic(root)
  return async (ctx, next) => {
    if(typeof path === 'string' && ctx.request.url.startsWith(path) || path instanceof RegExp && path.test(ctx.request.url)){
      return static_(ctx, async () => {});
    }
    return next();
  };
}
