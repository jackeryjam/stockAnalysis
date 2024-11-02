console.log('[Content] Script loaded in:', window.location.href);

// 创建一个Promise来跟踪代理是否准备就绪
const proxyReadyPromise = new Promise(async (resolve) => {
    try {
        // 请求background script注入代码
        console.log('[Content] Requesting script injection');
        chrome.runtime.sendMessage({
            type: 'INJECT_PROXY',
            tabId: window.location.href // 发送当前页面URL而不是扩展ID
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('[Content] Injection failed:', chrome.runtime.lastError);
            } else {
                console.log('[Content] Injection response:', response);
            }
            resolve();
        });
    } catch (error) {
        console.error('[Content] Script injection failed:', error);
        resolve(); // 即使失败也resolve，让流程继续
    }
});

// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Content] Received chrome message:', request);
    
    if (request.type === 'FETCH_DATA') {
        console.log('[Content] Fetching data from:', request.url);
        
        fetch(request.url, {
            method: request.method || 'GET',
            headers: request.headers || {},
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            console.log('[Content] Fetch successful:', data);
            sendResponse({ success: true, data: data });
        })
        .catch(error => {
            console.error('[Content] Fetch error:', error);
            sendResponse({ success: false, error: error.message });
        });
        
        return true;
    }
});

// 监听页面消息
window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    
    console.log('[Content] Received window message:', event.data);
    
    if (event.data?.type === 'PROXY_REQUEST' && event.data?.options) {
        try {
            const { requestId, ...requestOptions } = event.data.options;
            console.log('[Content] Sending message to background');
            const response = await chrome.runtime.sendMessage({
                type: 'PROXY_REQUEST',
                ...requestOptions,
                requestId
            });
            
            console.log('[Content] Received response from background:', response);
            window.postMessage({
                type: 'PROXY_RESPONSE',
                requestId: requestId,
                response: response
            }, '*');
        } catch (error) {
            console.error('[Content] Error:', error);
            window.postMessage({
                type: 'PROXY_RESPONSE',
                requestId: event.data.options.requestId,
                error: error.message
            }, '*');
        }
    }
});

// 通知background script代理已就绪
proxyReadyPromise.then(() => {
    console.log('[Content] Notifying background script that proxy is ready');
    chrome.runtime.sendMessage({ type: 'PROXY_READY' });
}); 