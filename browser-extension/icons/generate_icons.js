// 使用 Canvas 生成图标
function generateIcon(size) {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // 背景
    ctx.fillStyle = '#4285f4';
    ctx.fillRect(0, 0, size, size);
    
    // 箭头
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size / 8;
    ctx.lineCap = 'round';
    
    // 绘制箭头
    ctx.beginPath();
    ctx.moveTo(size * 0.25, size * 0.5);
    ctx.lineTo(size * 0.75, size * 0.5);
    ctx.stroke();
    
    // 箭头头部
    ctx.beginPath();
    ctx.moveTo(size * 0.6, size * 0.3);
    ctx.lineTo(size * 0.75, size * 0.5);
    ctx.lineTo(size * 0.6, size * 0.7);
    ctx.stroke();
    
    return canvas.convertToBlob();
}

// 生成不同尺寸的图标
async function generateIcons() {
    const sizes = [16, 48, 128];
    const icons = {};
    
    for (const size of sizes) {
        const blob = await generateIcon(size);
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const dataUrl = `data:image/png;base64,${base64}`;
        icons[size] = dataUrl;
    }
    
    return icons;
}

// 保存图标
generateIcons().then(icons => {
    // 这里会输出 base64 格式的图标数据
    console.log(icons);
}); 