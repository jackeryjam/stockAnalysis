// 创建代理就绪状态
window.__proxyReady = false;

// 创建一个全局的初始化Promise
window.__proxyReadyPromise = new Promise((resolve) => {
    console.log('Initializing proxy...');
    // 检查是否已经就绪
    if (window.__proxyReady) {
        console.log('Proxy already ready');
        resolve();
    } else {
        // 创建一个MutationObserver来监听DOM变化
        const observer = new MutationObserver(() => {
            if (window.__proxyReady) {
                console.log('Proxy became ready');
                observer.disconnect();
                resolve();
            }
        });
        
        observer.observe(document, {
            childList: true,
            subtree: true
        });
    }
});

// 代理就绪检查函数
window.proxyReady = () => window.__proxyReadyPromise;

// 生成唯一请求ID
function generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 代理请求函数
window.proxyRequest = async (options) => {
    console.log('[Proxy] Request called with options:', options);
    
    // 确保代理已就��
    await window.proxyReady();
    console.log('[Proxy] Ready check passed, proceeding with request');
    
    return new Promise((resolve, reject) => {
        const requestId = generateRequestId();
        console.log('[Proxy] Generated request ID:', requestId);
        
        const messageHandler = (event) => {
            console.log('[Proxy] Raw message received:', event);
            console.log('[Proxy] Received window message:', event.data);
            
            if (event.data?.type === 'PROXY_RESPONSE' && 
                event.data?.requestId === requestId) {
                console.log('[Proxy] Matched response for request:', requestId);
                window.removeEventListener('message', messageHandler);
                if (event.data.error) {
                    console.error('[Proxy] Request failed:', event.data.error);
                    reject(new Error(event.data.error));
                } else {
                    console.log('[Proxy] Request succeeded:', event.data.response);
                    resolve(event.data.response);
                }
            }
        };

        window.addEventListener('message', messageHandler);
        
        const message = {
            type: 'PROXY_REQUEST',
            options: {
                ...options,
                requestId
            }
        };
        console.log('[Proxy] Sending message to content script:', message);
        // 使用 '*' 作为目标源以支持 file:// 协议
        window.postMessage(message, '*');
    });
};

// 标记代理已就绪
window.__proxyReady = true;
console.log('Proxy initialized and ready');

// 添加错误处理
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});