document.addEventListener('DOMContentLoaded', function() {
    // 显示扩展ID
    document.getElementById('extensionId').textContent = chrome.runtime.id;
}); 