// GoFile.io 配置
const GOFILE_ACCOUNT_ID = '9e174948-3c6c-47e6-a706-8aedbf7b8598';
const GOFILE_ACCOUNT_TOKEN = '8UO7T53rxM6Eh3WzolDR4SeaLedZ17bE';
// 获取GoFile服务器
async function getGoFileServer() {
    try {
        // **关键修复**: GoFile API 端点是 /servers 而不是 /getServer
        const response = await fetch('https://api.gofile.io/servers');
if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`获取服务器失败，状态码: ${response.status}. 响应: ${errorText}`);
}
        const data = await response.json();
if (data.status === 'ok') {
            // 返回推荐的服务器
            return data.data.servers[0].name;
} else {
            throw new Error('无法获取GoFile服务器: ' + (data.status || '未知状态'));
}
    } catch (error) {
        console.error('获取GoFile服务器错误:', error);
        throw error;
}
}

// 上传文件到GoFile
async function uploadToGoFile(file, onProgress) {
    try {
        // 1. 获取服务器
        const server = await getGoFileServer();
// 2. 创建FormData
        const formData = new FormData();
        formData.append('token', GOFILE_ACCOUNT_TOKEN);
        formData.append('file', file);
// 3. 使用XMLHttpRequest上传以支持进度
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `https://${server}.gofile.io/uploadFile`, true);
            
            // 进度事件监听
            xhr.upload.addEventListener('progress', (event) => {
                
if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    if (onProgress) onProgress(percent);
                }
            });
            
         
   // 请求完成处理
            xhr.onload = () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
            
            if (response.status === 'ok') {
                            // **优化**: 直接返回需要的数据
                            resolve({
                                directLink: `https://${server}.gofile.io/download/${response.data.fileId}/${response.data.fileName}`,
                                fileId: response.data.fileId,
                                fileName: response.data.fileName,
                            });
                        } else {
                            reject(new Error('上传失败: 
' + (response.data.error || response.status)));
                        }
                    } catch (e) {
                        reject(new Error('服务器返回无效响应: ' + xhr.responseText));
}
                } else {
                    reject(new Error(`上传失败，状态码: ${xhr.status}, 响应: ${xhr.responseText}`));
}
            };
// 错误处理
            xhr.onerror = () => {
                reject(new Error('网络错误，请检查连接'));
};
            
            xhr.onabort = () => {
                reject(new Error('上传已取消'));
};
            
            // 4. 发送请求
            xhr.send(formData);
        });
} catch (error) {
        console.error('上传到GoFile错误:', error);
        throw error;
}
}

// 获取书柜中的漫画（从localStorage）
async function getComicsInBookcase(bookcaseId) {
    try {
        // 从localStorage获取书柜中的漫画
        const files = JSON.parse(localStorage.getItem(`bookcase_${bookcaseId}_files`) || '[]');
return files.map(file => ({
            name: file.name,
            url: file.directLink,
            format: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'zip'
        }));
} catch (error) {
        console.error('获取书柜漫画错误:', error);
        throw error;
    }
}