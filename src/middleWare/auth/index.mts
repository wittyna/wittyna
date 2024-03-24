import { Context, Middleware } from 'koa';
import axios from 'axios';
import { createHash } from 'node:crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { pathConcat } from '../../utils/index.mjs';
import chalk from 'chalk';
export const sha256 = (data: string) =>
  createHash('sha256').update(data).digest('base64url');
const success = chalk.bold.green;
const warn = chalk.bold.yellow;

// after sessionMiddleWare
export const authMiddleWare = ({
  clientId,
  clientSecret,
  apiPrefix,
  uiUrl,
  authServerOrigin,
}: {
  // 客户端id
  clientId: string;
  // 客户端密钥
  clientSecret: string;
  // api前缀,用于识别api接口进入
  apiPrefix: string;
  // 客户端ui的url，clientAuthorizeUrl认证通过后会默认跳转到这个地址
  uiUrl: string;
  // 认证服务器的地址
  authServerOrigin: string;
}): Middleware => {
  if (!apiPrefix) {
    throw new Error('authMiddleWare: apiPrefix is required');
  }
  if (!authServerOrigin) {
    throw new Error('authMiddleWare: authServerOrigin is required');
  }
  const apiPrefix_ = new URL(apiPrefix);
  const clientAuthorizeUrl = pathConcat(apiPrefix, '/authorize');
  const clientLogoutApiPath = pathConcat(apiPrefix_.pathname, '/logout');
  const clientUserInfoApiPath = pathConcat(apiPrefix_.pathname, '/userInfo');
  let jwtPublicKey: Buffer;
  function getJwtPublicKey() {
    setTimeout(async () => {
      try {
        const { data } = await axios.get(
          `${authServerOrigin}/auth/jwtPublicKey`,
          {
            responseType: 'arraybuffer',
          }
        );
        jwtPublicKey = data;
        console.log(success('get jwtPublicKey success'));
      } catch (e) {
        console.log(warn('cannot get jwtPublicKey, retry after 3s'));
        getJwtPublicKey();
      }
    }, 3000);
  }
  getJwtPublicKey();

  function setError({
    context,
    redirect_uri_,
    state,
  }: {
    context: Context;
    state?: string;
    redirect_uri_?: string;
  }) {
    // 随机数
    const code_verifier = Math.random().toString(36).slice(2);
    const session = context.session as any;
    session.code_verifier = code_verifier;
    const redirect_uri = new URL(`${authServerOrigin}/auth/authorize`);
    const clientAuthorizeUrl_ = new URL(clientAuthorizeUrl);
    if (redirect_uri_) {
      clientAuthorizeUrl_.searchParams.set('redirect_uri', redirect_uri_);
    }
    redirect_uri.searchParams.set('client_id', clientId);
    redirect_uri.searchParams.set('response_type', 'code');
    redirect_uri.searchParams.set('redirect_uri', clientAuthorizeUrl_.href);
    redirect_uri.searchParams.set('code_challenge', sha256(code_verifier));
    redirect_uri.searchParams.set('code_challenge_method', 's256');
    redirect_uri.searchParams.set('state', state || '');
    context.redirect(redirect_uri.href);
  }

  function setError2({
    context,
    redirect_uri,
    redirect,
    state,
  }: {
    context: Context;
    state?: string;
    redirect?: boolean;
    redirect_uri?: string;
  }) {
    const session = context.session as any;
    session.access_token = undefined;
    session.id_token = undefined;
    session.refresh_token = undefined;
    session.tokenInfo = undefined;
    session.code_verifier = undefined;
    const clientAuthorizeUrl_ = new URL(clientAuthorizeUrl);
    if (state) {
      clientAuthorizeUrl_.searchParams.set('state', state);
    }
    if (redirect_uri) {
      clientAuthorizeUrl_.searchParams.set('redirect_uri', redirect_uri);
    }
    if (redirect) {
      context.redirect(clientAuthorizeUrl_.href);
      return;
    } else {
      context.response.status = 401;
      context.body = {
        error: 'Unauthorized',
        redirect_uri: clientAuthorizeUrl_.href,
      };
    }
  }
  return async (context, next) => {
    const session = context.session as any;
    const clientAuthorizeUrl_ = new URL(clientAuthorizeUrl);
    // /authorize 授权
    if (context.path === clientAuthorizeUrl_.pathname) {
      if (context.request?.query?.code && context.session?.code_verifier) {
        try {
          const { data } = await axios.post<{
            access_token: string;
            token_type: 'Bearer';
            expires_in: string;
            refresh_token: string;
            id_token: string;
          }>(
            authServerOrigin + '/auth/token',
            {},
            {
              params: {
                code: context.request?.query?.code,
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'authorization_code',
                code_verifier: context.session?.code_verifier,
              },
            }
          );
          const tokenInfo = getJwtInfo(data.id_token, jwtPublicKey);
          Object.assign(session, data);
          session.tokenInfo = tokenInfo;
          let uiUrl_ = new URL(uiUrl);
          if (context.request?.query?.redirect_uri) {
            uiUrl_ = new URL(context.request?.query?.redirect_uri as string);
          }
          if (context.request?.query?.state) {
            uiUrl_.searchParams.set(
              'state',
              context.request?.query?.state as string
            );
          }
          context.redirect(uiUrl_.href);
          return;
        } catch (e) {
          return setError({
            context: context as Context,
            state: context.request?.query?.state as string,
            redirect_uri_: context.request?.query?.redirect_uri as string,
          });
        }
      } else {
        return setError({
          context: context as Context,
          state: context.request?.query?.state as string,
          redirect_uri_: context.request?.query?.redirect_uri as string,
        });
      }
    }
    // 如果带header authorization token
    if (context.headers.authorization) {
      const [tokenType, token] = context.headers.authorization.split(' ');
      session.token_type = tokenType;
      // 如果是jwt
      if (token.indexOf('.') > -1) {
        session.id_token = token;
        session.tokenInfo = getJwtInfo(token, jwtPublicKey);
      } else {
        session.access_token = token;
        const { data } = await axios({
          url: authServerOrigin + '/auth/user/info',
          method: 'GET',
          headers: {
            Authorization: `${session.token_type} ${
              session.access_token || session.id_token
            }`,
          },
        });
        session.tokenInfo = {
          userId: data.id,
          clientId,
        };
      }
    }
    // /logout 登出
    if (context.path === clientLogoutApiPath) {
      try {
        await axios.get(authServerOrigin + '/auth/logout', {
          params: {
            access_token: session.access_token || '',
            id_token: session.id_token || '',
          },
        });
        const authLogoutUrl = new URL(authServerOrigin + '/auth/logout');
        const clientAuthorizeUrl_ = new URL(clientAuthorizeUrl);
        if (context.query.redirect_uri) {
          clientAuthorizeUrl_.searchParams.set(
            'redirect_uri',
            context.query.redirect_uri as string
          );
        }
        if (context.query.state) {
          clientAuthorizeUrl_.searchParams.set(
            'state',
            context.query.state as string
          );
        }
        authLogoutUrl.searchParams.set(
          'redirect_uri',
          clientAuthorizeUrl_.href
        );
        context.redirect(authLogoutUrl.href);
        return;
      } catch (e) {
        setError2({
          context: context as Context,
          redirect: true,
          redirect_uri: context.query.redirect_uri as string,
          state: context.query.state as string,
        });
      }
      return;
    }

    if (!session.id_token && !session.access_token) {
      return setError2({ context: context as Context });
    }
    // 刷新token
    else if (
      session.refresh_token &&
      session.tokenInfo.exp! * 1000 < Date.now() - 1000 * 60
    ) {
      try {
        const { data } = await axios.post<{
          access_token: string;
          token_type: 'Bearer';
          expires_in: string;
          refresh_token: string;
          id_token: string;
        }>(
          authServerOrigin + '/auth/token',
          {},
          {
            params: {
              refresh_token: session.refresh_token,
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: 'refresh_token',
            },
          }
        );
        const tokenInfo = getJwtInfo(data.id_token, jwtPublicKey);
        Object.assign(session, data);
        session.tokenInfo = tokenInfo;
        return next();
      } catch (e) {
        return setError2({ context: context as Context });
      }
    }

    // /user/info 获取用户信息
    else if (context.path === clientUserInfoApiPath) {
      if (session.access_token || session.id_token) {
        try {
          const { data } = await axios({
            url: authServerOrigin + '/auth/user/info',
            method: 'GET',
            headers: {
              Authorization: `${session.token_type} ${
                session.access_token || session.id_token
              }`,
            },
          });
          context.body = data;
        } catch (e) {
          return setError2({
            context: context as Context,
          });
        }
        context.response.status = 200;
        return;
      }
      return setError2({
        context: context as Context,
      });
    }
    return next();
  };
};

function getJwtInfo(
  jwt_: string,
  jwtPublicKey: Buffer
): JwtPayload | undefined {
  try {
    const res = jwt.verify(jwt_, jwtPublicKey) as JwtPayload;
    if (res.exp! * 1000 < Date.now()) {
      return undefined;
    }
    return res;
  } catch (e) {
    throw new Error('jwt verify error');
  }
}
