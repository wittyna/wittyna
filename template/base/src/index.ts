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
} from '../../../src/index.mjs';
import { sessionMiddleWare, staticMiddleWare } from '../../../src/index.mjs';
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
