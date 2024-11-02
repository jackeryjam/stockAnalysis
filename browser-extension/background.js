// 确保Service Worker正常运行
self.addEventListener('activate', event => {
  console.log('[Background] Service Worker activated');
});

self.addEventListener('install', event => {
  console.log('[Background] Service Worker installed');
  self.skipWaiting(); // 确保新的Service Worker立即激活
});

// 添加普通消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', {
    type: request.type,
    url: request.url,
    method: request.method,
    requestId: request.requestId
  });
  console.log('[Background] From sender:', {
    tabId: sender.tab?.id,
    url: sender.tab?.url,
    origin: sender.origin
  });
  
  if (request.type === 'PROXY_REQUEST') {
    try {
      const targetDomain = request.targetDomain || new URL(request.url).hostname;
      console.log(`[Background] Looking for tabs with domain: ${targetDomain}`);
      console.log('[Background] Request details:', {
        requestId: request.requestId,
        method: request.method,
        headers: request.headers,
        targetDomain: targetDomain
      });
      
      chrome.tabs.query({url: `*://*.${targetDomain}/*`}, (tabs) => {
        console.log('[Background] Query result:', {
          matchingTabs: tabs.length,
          tabDetails: tabs.map(tab => ({
            id: tab.id,
            url: tab.url,
            status: tab.status
          }))
        });
        
        if (tabs.length > 0) {
          const targetTab = tabs[0];
          console.log('[Background] Selected target tab:', {
            id: targetTab.id,
            url: targetTab.url,
            status: targetTab.status
          });
          
          chrome.tabs.sendMessage(targetTab.id, {
            type: 'FETCH_DATA',
            url: request.url,
            method: request.method,
            headers: request.headers,
            requestId: request.requestId
          }, response => {
            const error = chrome.runtime.lastError;
            if (error) {
              console.error('[Background] Error sending message to tab:', {
                error: error.message,
                tabId: targetTab.id,
                requestId: request.requestId
              });
              sendResponse({ success: false, error: error.message });
            } else {
              console.log('[Background] Received response from tab:', {
                requestId: request.requestId,
                success: response.success,
                hasData: !!response.data,
                error: response.error
              });
              sendResponse(response);
            }
          });
        } else {
          const error = `未找到${targetDomain}的页面，请确保已打开并登录`;
          console.error('[Background] No matching tabs found:', {
            targetDomain,
            requestId: request.requestId,
            error
          });
          sendResponse({ success: false, error });
        }
      });
      return true; // 保持消息通道开启
    } catch (error) {
      console.error('[Background] Error processing request:', {
        error: error.message,
        stack: error.stack,
        requestId: request.requestId
      });
      sendResponse({ success: false, error: error.message });
      return true;
    }
  }
  
  if (request.type === 'PROXY_READY') {
    console.log('[Background] Proxy ready notification received:', {
      tabId: sender.tab?.id,
      url: sender.tab?.url
    });
  }
});

// 监听扩展安装/更新事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Extension installed/updated');
  console.log('[Background] Extension ID:', chrome.runtime.id);
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('[Background] Tab updated:', {
    tabId,
    status: changeInfo.status,
    url: changeInfo.url,
    currentUrl: tab.url
  });
});

// 监听标签页移除
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('[Background] Tab removed:', {
    tabId,
    windowId: removeInfo.windowId,
    isWindowClosing: removeInfo.isWindowClosing
  });
});

// 添加全局错误处理
self.addEventListener('error', (event) => {
  console.error('[Background] Global error:', {
    message: event.error.message,
    stack: event.error.stack,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Background] Unhandled promise rejection:', {
    reason: event.reason,
    stack: event.reason.stack
  });
});

// 添加注入代码的处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Background] Message received:', request);
    
    if (request.type === 'INJECT_PROXY') {
        console.log('[Background] Injecting proxy script to tab:', sender.tab.id);
        
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            world: "MAIN", // 在主世界中执行脚本
            func: () => {
                if (!window.__proxyInitialized) {
                    console.log('[Proxy] Initializing proxy functions');
                    window.__proxyInitialized = true;
                    
                    // 在全局作用域定义函数
                    Object.defineProperties(window, {
                        'proxyRequest': {
                            value: async (options) => {
                                console.log('[Proxy] Request called with options:', options);
                                const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                                
                                return new Promise((resolve, reject) => {
                                    const messageHandler = (event) => {
                                        if (event.data?.type === 'PROXY_RESPONSE' && 
                                            event.data?.requestId === requestId) {
                                            window.removeEventListener('message', messageHandler);
                                            if (event.data.error) {
                                                reject(new Error(event.data.error));
                                            } else {
                                                resolve(event.data.response);
                                            }
                                        }
                                    };
                                    window.addEventListener('message', messageHandler);
                                    window.postMessage({
                                        type: 'PROXY_REQUEST',
                                        options: {
                                            ...options,
                                            requestId
                                        }
                                    }, '*');
                                });
                            },
                            writable: false,
                            configurable: false
                        }
                    });
                    
                    console.log('[Proxy] Initialized and ready');
                    console.log('[Proxy] proxyRequest is available:', typeof window.proxyRequest);
                } else {
                    console.log('[Proxy] Already initialized');
                }
            }
        }).then(() => {
            console.log('[Background] Script injection successful');
            sendResponse({ success: true });
        }).catch((error) => {
            console.error('[Background] Script injection failed:', error);
            sendResponse({ success: false, error: error.message });
        });
        
        return true; // 保持消息通道开启
    }
}); 