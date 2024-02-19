import { hasBadWords } from "./libs/hasBadWords";

export interface Env {
  KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const badWords = (await env.KV.get('badWords', { cacheTtl: 300 }) ?? '').split(';').filter(w => w != '');
    const ccLimit = Number((await env.KV.get('ccLimit', { cacheTtl: 3600 }) ?? '4'));
    const atLimit = Number((await env.KV.get('atLimit', { cacheTtl: 3600 }) ?? '4'));

    // HEADやGETの場合はそのまま返す
    if (request.method === 'HEAD' || request.method === 'GET') {
      return await fetch(request.url, {
        method: request.method,
        headers: request.headers,
      });
    }
    const body = await request.text();

    try {
      const bodyJson = JSON.parse(body)
      const cc = bodyJson.cc?.length ?? 0;

      // Check if mentions exceed the limit
      const mentions = (bodyJson.text || '').match(/@.*?@.*?\..*?/g) || [];
      if (mentions.length > atLimit) {
        return new Response(JSON.stringify({
          error: {
            message: 'Too many Ats.',
            code: 'TOO_MANY_ATS',
            id: 'c7e10ff1-042f-441a-b490-836956560650',
          }
        }), {
          // Note: Returning a 400 in ActivityPub may result in repeated retries from the remote or, in the worst case, delivery suspension. Therefore, return a 202 for 'inbox'.
          status: request.url.includes('inbox') ? 202 : 400,
        });
      }

      if (cc > ccLimit) {
        return new Response(JSON.stringify({
          error: {
            message: 'その投稿にはメンションが多すぎます。',
            code: 'BAD_WORDS',
            id: 'c1d9e31a-85ee-45b9-9456-7c749fc4f475',
          }
        }), {
          // Note: ActivityPubで400を返してしまうとリモートからのretryが相次いだり、最悪配送停止されてしまったりするので、inboxでは202を返す
          status: request.url.includes('inbox') ? 202 : 400,
        });
      }

    } catch (e) {
      // do nothing
    }

    // NGワードを含む場合はエラーで弾く
    if (hasBadWords(body, badWords)) {
      const message = (await env.KV.get('errorMessage') ?? 'その投稿には不適切な単語が含まれています。')
      return new Response(JSON.stringify({
        error: {
          message: message,
          code: 'BAD_WORDS',
          id: 'c1d9e31a-85ee-45b9-9456-7c749fc4f475',
        }
      }), {
        // Note: ActivityPubで400を返してしまうとリモートからのretryが相次いだり、最悪配送停止されてしまったりするので、inboxでは202を返す
        status: request.url.includes('inbox') ? 202 : 400,
      });
    }

    return await fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body,
    });
  },
};