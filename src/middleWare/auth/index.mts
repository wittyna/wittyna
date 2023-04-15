import { Context, Middleware } from 'koa';
import axios from 'axios';
import { createHash } from 'node:crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { pathConcat } from '../../utils/index.mjs';

export const sha256 = (data: string) =>
  createHash('sha256').update(data).digest('base64url');
// after sessionMiddleWare
// todo jwt public key 校验
export const authMiddleWare = ({
  client_id,
  client_secret,
  apiPrefix,
  uiUrl,
  authServerOrigin,
}: {
  // 客户端id
  client_id: string;
  // 客户端密钥
  client_secret: string;
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
  const apiPrefixPath = apiPrefix_.pathname;
  const clientAuthorizeUrl = pathConcat(apiPrefix, '/authorize');
  const clientLogoutApiPath = pathConcat(apiPrefix_.pathname, '/logout');
  const clientUserInfoApiPath = pathConcat(apiPrefix_.pathname, '/userInfo');
  let jwtPublicKey: Buffer;
  setTimeout(() => {
    axios
      .get(`${authServerOrigin}/jwtPublicKey`, {
        responseType: 'arraybuffer',
      })
      .then((res) => {
        jwtPublicKey = res.data;
      })
      .catch((e) => {
        console.log(e);
      });
  }, 5000);

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
    const redirect_uri = new URL(`${authServerOrigin}/authorize`);
    const clientAuthorizeUrl_ = new URL(clientAuthorizeUrl);
    if (redirect_uri_) {
      clientAuthorizeUrl_.searchParams.set('redirect_uri', redirect_uri_);
    }
    redirect_uri.searchParams.set('client_id', client_id);
    redirect_uri.searchParams.set('response_type', 'code');
    redirect_uri.searchParams.set('redirect_uri', clientAuthorizeUrl_.href);
    redirect_uri.searchParams.set('code_challenge', sha256(code_verifier));
    redirect_uri.searchParams.set('code_challenge_method', 's256');
    redirect_uri.searchParams.set('state', state || '');
    context.redirect(redirect_uri.href);
  }
  function setError2({
    context,
    redirect_uri_,
    redirect,
    state,
  }: {
    context: Context;
    state?: string;
    redirect?: boolean;
    redirect_uri_?: string;
  }) {
    const session = context.session as any;
    session.access_token = undefined;
    session.id_token = undefined;
    session.refresh_token = undefined;
    session.token_info = undefined;
    const clientAuthorizeUrl_ = new URL(clientAuthorizeUrl);
    if (state) {
      clientAuthorizeUrl_.searchParams.set('state', state);
    }
    if (redirect_uri_) {
      clientAuthorizeUrl_.searchParams.set('redirect_uri', redirect_uri_);
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
            authServerOrigin + '/token',
            {},
            {
              params: {
                code: context.request?.query?.code,
                client_id,
                client_secret,
                grant_type: 'authorization_code',
                code_verifier: context.session?.code_verifier,
              },
            }
          );
          const token_info = getJwtInfo(data.id_token, jwtPublicKey);
          Object.assign(session, data);
          session.token_info = token_info;
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
    } else if (context.path === clientLogoutApiPath) {
      try {
        await axios.get(authServerOrigin + '/logout', {
          params: {
            access_token: session.access_token,
          },
        });
        const authLogoutUrl = new URL(authServerOrigin + '/logout');
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
          redirect_uri_: context.query.redirect_uri as string,
          state: context.query.state as string,
        });
      }
      return;
    } else if (context.path === clientUserInfoApiPath) {
      if (session.access_token) {
        try {
          const { data } = await axios({
            url: authServerOrigin + '/user/info',
            method: 'GET',
            headers: {
              Authorization: `${session.token_type} ${session.access_token}`,
            },
          });
          console.log(data, 111);
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

    if (context.path.startsWith(apiPrefixPath)) {
      if (!session.token_info) {
        return setError2({ context: context as Context });
      } else if (session.token_info.exp! * 1000 < Date.now() - 1000 * 60) {
        try {
          const { data } = await axios.post<{
            access_token: string;
            token_type: 'Bearer';
            expires_in: string;
            refresh_token: string;
            id_token: string;
          }>(
            authServerOrigin + '/token',
            {},
            {
              params: {
                refresh_token: session.refresh_token,
                client_id,
                client_secret,
                grant_type: 'refresh_token',
              },
            }
          );
          const token_info = getJwtInfo(data.id_token, jwtPublicKey);
          Object.assign(session, data);
          session.token_info = token_info;
          return next();
        } catch (e) {
          return setError2({ context: context as Context });
        }
      }
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
