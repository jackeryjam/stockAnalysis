document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', fetchStockData);
    
    // 等待代理方法可用后再初始加载数据
    waitForProxy().then(() => {
        fetchStockData();
    });
});

// 等待代理方法可用
function waitForProxy(retries = 50) {
    return new Promise((resolve, reject) => {
        if (window.proxyRequest) {
            resolve();
            return;
        }

        let count = 0;
        const interval = setInterval(() => {
            if (window.proxyRequest) {
                clearInterval(interval);
                resolve();
            } else if (count >= retries) {
                clearInterval(interval);
                reject(new Error('代理初始化超时'));
            }
            count++;
        }, 100);
    });
}

function showExtensionNotice() {
    const container = document.querySelector('.container');
    const notice = document.createElement('div');
    notice.className = 'notice error';
    notice.innerHTML = `
        <p>请注意：</p>
        <ol>
            <li>请先安装浏览器扩展</li>
            <li>确保已经打开并登录了东方财富网</li>
            <li>刷新本页面</li>
        </ol>
    `;
    container.insertBefore(notice, container.firstChild);
}

async function fetchStockData() {
    try {
        const apiUrl = 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=50&po=1&np=1&fltt=2&invt=2&fid=f3&fs=b:DLMK0106&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f26,f22,f33,f11,f62,f128,f136,f115,f152';
        
        const response = await window.proxyRequest({
            url: apiUrl,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Referer': 'https://quote.eastmoney.com/'
            },
            // 指定目标域名，用于查找对应的标签页
            targetDomain: 'quote.eastmoney.com'
        });

        console.log('Received response:', response);

        if (response.success) {
            const stockData = transformData(response.data);
            updateTable(stockData);
        } else {
            console.error('获取数据失败:', response.error);
            showError(response.error);
        }
    } catch (error) {
        console.error('请求失败:', error);
        showError(error.message);
        showExtensionNotice();
    }
}

// 转换API返回的数据为所需格式
function transformData(apiData) {
    if (!apiData || !apiData.data || !apiData.data.diff) {
        return [];
    }

    return apiData.data.diff.map(item => ({
        code: item.f12,
        name: item.f14,
        price: item.f2,
        change: item.f3,
        volume: item.f5,
        amount: item.f6
    }));
}

function updateTable(data) {
    const tbody = document.querySelector('#stockTable tbody');
    tbody.innerHTML = '';
    
    data.forEach(stock => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${stock.code}</td>
            <td>${stock.name}</td>
            <td>${stock.price}</td>
            <td>${stock.change}%</td>
            <td>${stock.volume}</td>
            <td>${stock.amount}</td>
        `;
        tbody.appendChild(row);
    });
}

function showError(message) {
    const container = document.querySelector('.container');
    const notice = document.createElement('div');
    notice.className = 'notice error';
    notice.innerHTML = `
        <p>错误信息：${message}</p>
    `;
    
    // 移除之前的错误提示
    const oldNotice = container.querySelector('.notice.error');
    if (oldNotice) {
        oldNotice.remove();
    }
    
    container.insertBefore(notice, container.firstChild);
} 