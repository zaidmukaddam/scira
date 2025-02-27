// utils/proxy-fetch.ts
import { ProxyAgent } from 'undici';

// 固定代理配置
const FIXED_PROXY_URL = 'http://127.0.0.1:7890'; // 在此处修改固定代理地址

export interface ProxyFetchOptions {
    /**
     * 请求超时时间（毫秒）
     * @default 30000
     */
    timeout?: number;
}

/**
 * 创建固定代理的自定义fetch方法
 */
export function createFixedProxyFetch(options?: ProxyFetchOptions): typeof fetch {
    const timeout = options?.timeout || 30000;
    const proxyAgent = new ProxyAgent(FIXED_PROXY_URL);

    return async (input, init) => {
        // ...保持原有实现不变...
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(input, {
                ...init,
                dispatcher: proxyAgent,
                signal: controller.signal,
                headers: {
                    ...init?.headers,
                    'Content-Type': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    Connection: 'keep-alive'
                }
            });

            Object.defineProperty(response, 'headers', {
                value: response.headers || new Headers(),
                writable: true
            });

            return response;

        } catch (error) {
            return new Response(JSON.stringify({
                error: {
                    message: `Proxy request failed: ${error.message}`,
                    type: 'proxy_error'
                }
            }), {
                status: 502,
                headers: { 'Content-Type': 'application/json' }
            });
        } finally {
            clearTimeout(timeoutId);
        }
    };
}
