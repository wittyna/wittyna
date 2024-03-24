# wittyna
## 简介
###### 一个基于KOA的服务端框架。对比 nestjs, midway 等框架，wittyna更加轻量，灵活，简单。

## 特性
* 控制器类、装饰器轻松实现路由分发
* 装饰器参数校验
* 中间件支持,内置的中间件有：
  * body
  * response
  * session
  * static
  * mongodb

## 安装
```bash
npm install wittyna
```

## 使用
```ts
import {
  startServer,
  responseMiddleWare,
  bodyMiddleWare,
  Controller,
  Body,
  Post,
  BodyFile,
  Get,
  Query,
  Put,
  ResponseError,
  Required,
} from 'wittyna';
import { sessionMiddleWare, staticMiddleWare } from 'wittyna';
import { Context } from 'koa';
import { dirname } from 'path';

@Controller('hello')
export class HelloController {
  @Get('123')
  async get(@Query('a') b: number, ctx: Context): Promise<unknown> {
    const session = ctx.session as unknown as { count: number };
    ctx.cookies.set('a', '1', { httpOnly: false });
    session.count = session.count || 0;
    session.count++;
    console.log(session.count);
    console.log(
      ctx.request.hostname,
      ctx.request.originalUrl,
      ctx.request.path,
      ctx.request.querystring
    );
    return { count: session.count, b: typeof b };
  }
}

startServer({
  port: 3000,
  controllers: [new HelloController()],
  routerPrefix: '/api',
  middlewares: [
    staticMiddleWare({
      root: dirname(new URL(import.meta.url).pathname),
      pathPrefix: '/public',
    }),
    sessionMiddleWare({
      redisOptions: {
        host: 'localhost',
        port: 6379,
        db: 0,
      },
    }),
    responseMiddleWare(),
    bodyMiddleWare(),
  ],
});
```