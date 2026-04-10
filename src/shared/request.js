/**
 * 网络请求工具模块
 * 基于 GM_xmlhttpRequest 封装
 */

/**
 * 发送 HTTP 请求
 * @param {string} url - 请求 URL
 * @param {object} options - 请求选项
 * @returns {Promise<object>} - 响应数据
 */
export async function request(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body = null,
    dataType = 'json',
    responseType = '',
    timeout = 30000,
  } = options;

  return new Promise((resolve, reject) => {
    const xhr = {
      method,
      url,
      headers,
      timeout,
      responseType,
      onload: (response) => {
        if (response.status >= 200 && response.status < 300) {
          try {
            let data;
            if (responseType === 'blob' || responseType === 'arraybuffer') {
              data = response.response;
            } else if (dataType === 'text') {
              data = response.responseText;
            } else if (dataType === 'json') {
              data = JSON.parse(response.responseText);
            } else {
              data = response.responseText;
            }

            resolve({ data, status: response.status, headers: response.responseHeaders });
          } catch (e) {
            resolve({ data: response.responseText, status: response.status });
          }
        } else {
          reject(new Error(`请求失败: ${response.status}`));
        }
      },
      onerror: () => reject(new Error('网络请求失败')),
      ontimeout: () => reject(new Error('请求超时')),
    };

    if (body) {
      xhr.data = typeof body === 'string' ? body : JSON.stringify(body);
      if (!xhr.headers['Content-Type'] && !xhr.headers['content-type']) {
        xhr.headers['Content-Type'] = 'application/json';
      }
    }

    GM_xmlhttpRequest(xhr);
  });
}

/**
 * GET 请求
 * @param {string} url - 请求 URL
 * @param {object} options - 请求选项
 * @returns {Promise<object>}
 */
export async function get(url, options = {}) {
  return request(url, { ...options, method: 'GET' });
}

/**
 * POST 请求
 * @param {string} url - 请求 URL
 * @param {object} data - 请求数据
 * @param {object} options - 请求选项
 * @returns {Promise<object>}
 */
export async function post(url, data, options = {}) {
  return request(url, { ...options, method: 'POST', body: data });
}
