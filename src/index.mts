import Koa from 'koa';
import Router from '@koa/router';
import Application from 'koa';
import { setController } from './controller/index.mjs';
import { ControllerInterface } from './controller/type.mjs';

export function startServer({
  controllers,
  routerPrefix = '/',
  middlewares,
  appKeys = ['123456'],
  port,
  options,
}: Props) {
  const app = new Koa();
  app.context.myOptions = options || {};
  // cookies 依赖需要这个key,用于防止生成的 cookie 的 被串改
  app.keys = appKeys;
  const router = new Router();
  for (const middleware of middlewares) {
    app.use(middleware);
  }

  for (let controller of controllers) {
    if (typeof controller === 'function') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      controller = new controller();
    }
    setController(router, routerPrefix, controller as ControllerInterface);
  }
  app.use(router.routes());
  app.listen(port);
}

interface Props {
  middlewares: Application.Middleware[];
  controllers: unknown[];
  port: number;
  routerPrefix?: string;
  appKeys?: string[];
  options?: {
    // 服务器标识符,请求错误时会自动带上
    iss?: string;
  };
}

export * from './controller/index.mjs';
export * from './middleWare/index.mjs';
export { File as BodyFile } from '@koa/multer';
