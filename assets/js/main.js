// =================================================================================
// 全局变量定义
// =================================================================================

let selectedBookcase = null; // 当前选中的书柜ID
let currentBookcasePassword = null; // 当前书柜的密码
let ably = null; // Ably实时通讯实例
let currentComic = null; // 当前正在阅读的漫画对象
let currentPage = 1; // 当前页码
let totalPages = 1; // 总页数
let currentZoom = 1.0; // 当前缩放比例
let currentRotation = 0; // 当前旋转角度
let keyboardListenerActive = false; // 键盘事件监听器是否激活
const ABLY_API_KEY = 'nc5NGw.wSmsXg:SMs5pD5aJ4hGMvNZnd7pJp2lYS2X1iCmWm_yeLx_pkk'; [cite_start]// Ably API密钥 [cite: 101]

// =================================================================================
// 页面初始化
// =================================================================================

/**
 * 页面加载完成后执行的初始化函数
 */
document.addEventListener('DOMContentLoaded', function() {
    // 1. 初始化Ably实时服务
    try {
        ably = new Ably.Realtime(ABLY_API_KEY);
        ably.connection.on('connected', () => {
            console.log('Ably连接成功！');
        });
        ably.connection.on('failed', (error) => {
            console.error('Ably连接失败:', error);
            alert('实时通讯服务连接失败，密码可能无法实时更新。');
        });
    } catch (error) {
        console.error("Ably 初始化失败:", error);
        alert("无法连接到实时服务，部分功能可能无法使用。");
    }
    
    [cite_start]// 2. 根据当前页面路径执行不同的初始化逻辑 [cite: 101]
    const currentPath = window.location.pathname;
    if (currentPath.includes('share.html')) {
        initSharePage();
    } else if (currentPath.includes('read.html')) {
        initReadPage();
    } else { // 默认为首页
        initHomePage();
    }
    
    [cite_start]// 3. 检查并应用夜间模式设置 [cite: 255]
    checkNightMode();
});

/**
 * 初始化首页 (index.html)
 */
function initHomePage() {
    document.getElementById('start-share-btn')?.addEventListener('click', () => {
        [cite_start]window.location.href = 'share.html'; // 点击分享按钮跳转到分享页面 [cite: 103]
    });
    
    document.getElementById('start-read-btn')?.addEventListener('click', () => {
        [cite_start]window.location.href = 'read.html'; // 点击阅读按钮跳转到阅读页面 [cite: 105]
    });
}

/**
 * 初始化分享页面 (share.html)
 */
function initSharePage() {
    generateBookcases(); [cite_start]// 动态生成书柜选项 [cite: 106]
    
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('comic-file');
    
    if (uploadArea && fileInput) {
        [cite_start]// 点击上传区域触发文件选择框 [cite: 107]
        uploadArea.addEventListener('click', () => fileInput.click());
        
        [cite_start]// 设置拖放事件监听 [cite: 108, 109, 110]
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        uploadArea.addEventListener('dragover', () => uploadArea.classList.add('drag-over'));
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
        uploadArea.addEventListener('drop', e => {
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelection();
            }
        });
        
        [cite_start]// 监听文件选择变化 [cite: 111]
        fileInput.addEventListener('change', handleFileSelection);
    }
    
    // 绑定页面上的按钮事件
    document.getElementById('upload-btn')?.addEventListener('click', uploadComic); [cite_start]// 上传按钮 [cite: 113]
    document.getElementById('back-btn')?.addEventListener('click', () => window.location.href = 'index.html'); [cite_start]// 返回首页按钮 [cite: 115]
    document.getElementById('copy-password')?.addEventListener('click', copyPasswordToClipboard); [cite_start]// 复制密码按钮 [cite: 117]
}

/**
 * 初始化阅读页面 (read.html)
 */
function initReadPage() {
    generateBookcases(); [cite_start]// 动态生成书柜选项 [cite: 120]
    
    // 绑定密码验证相关事件
    document.getElementById('verify-btn')?.addEventListener('click', verifyPassword); [cite_start]// 验证按钮 [cite: 121]
    document.getElementById('password-input')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            [cite_start]verifyPassword(); // 按回车键验证 [cite: 123]
        }
    });
    document.getElementById('toggle-password')?.addEventListener('click', togglePasswordVisibility); [cite_start]// 切换密码可见性 [cite: 125]
    
    [cite_start]// 绑定查看器控制按钮事件 [cite: 127]
    document.getElementById('prev-page')?.addEventListener('click', prevPage);
    document.getElementById('next-page')?.addEventListener('click', nextPage);
    document.getElementById('fullscreen-btn')?.addEventListener('click', toggleFullscreen);
    document.getElementById('zoom-in-btn')?.addEventListener('click', zoomIn);
    document.getElementById('zoom-out-btn')?.addEventListener('click', zoomOut);
    document.getElementById('rotate-btn')?.addEventListener('click', rotateComic);
    document.getElementById('fit-screen-btn')?.addEventListener('click', fitComicToScreen);
    document.getElementById('close-viewer')?.addEventListener('click', closeViewer);
    
    // 动态添加的夜间模式按钮
    const nightModeBtn = document.querySelector('.viewer-controls button[title*="夜间模式"]');
    nightModeBtn?.addEventListener('click', toggleNightMode);

    [cite_start]// 返回首页按钮 [cite: 129]
    document.getElementById('back-btn')?.addEventListener('click', () => window.location.href = 'index.html');
}

// =================================================================================
// UI交互与DOM操作
// =================================================================================

/**
 * 动态在页面上生成书柜
 */
function generateBookcases() {
    const bookcaseGrid = document.querySelector('.bookcase-grid'); [cite_start]// 获取书柜容器 [cite: 160]
    if (!bookcaseGrid) return;
    
    bookcaseGrid.innerHTML = ''; // 清空现有内容
    [cite_start]for (let i = 1; i <= 10; i++) { // 创建10个书柜 [cite: 161]
        const bookcase = document.createElement('div');
        bookcase.className = 'bookcase'; [cite_start]// [cite: 162]
        bookcase.dataset.id = i;
        bookcase.innerHTML = `<div class="bookcase-icon">📚</div><h3>书柜 ${i}</h3>`;
        
        bookcase.addEventListener('click', function() {
            // 更新选中状态
            document.querySelectorAll('.bookcase').forEach(b => b.classList.remove('selected'));
            [cite_start]this.classList.add('selected'); // [cite: 163]
            selectedBookcase = this.dataset.id;
            
            [cite_start]// 根据当前页面执行不同操作 [cite: 164]
            const currentPath = window.location.pathname;
            if (currentPath.includes('share.html')) {
                // 显示上传区域并更新书柜号
                document.querySelector('.upload-section').style.display = 'block'; [cite_start]// [cite: 164]
                document.getElementById('selected-bookcase-display').textContent = selectedBookcase; [cite_start]// [cite: 168]
            } else if (currentPath.includes('read.html')) {
                // 显示密码输入区域
                const passwordSection = document.getElementById('password-section');
                if (passwordSection) passwordSection.style.display = 'block'; [cite_start]// [cite: 169, 170]
                
                // 填充本地存储的密码或初始密码
                const passwordInput = document.getElementById('password-input');
                if (passwordInput) {
                    passwordInput.value = localStorage.getItem(`bookcase_${selectedBookcase}_password`) || '123456'; [cite_start]// [cite: 172, 173]
                    passwordInput.focus();
                }
            }
        });
        bookcaseGrid.appendChild(bookcase); [cite_start]// [cite: 174]
    }
}

/**
 * 处理用户选择的文件，并显示文件信息和预览
 */
function handleFileSelection() {
    const fileInput = document.getElementById('comic-file');
    const fileInfo = document.getElementById('file-info');
    if (!fileInput.files.length) {
        if (fileInfo) fileInfo.style.display = 'none';
        return;
    }

    const file = fileInput.files[0];
    [cite_start]// 显示文件名和大小 [cite: 175, 176]
    document.getElementById('file-name').textContent = `文件名: ${file.name}`;
    document.getElementById('file-size').textContent = `文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    
    [cite_start]// 生成文件预览 [cite: 177]
    const filePreview = document.getElementById('file-preview');
    filePreview.innerHTML = ''; // 清空旧预览
    let previewElement;
    if (file.type.startsWith('image/')) {
        previewElement = document.createElement('img');
        previewElement.src = URL.createObjectURL(file); [cite_start]// [cite: 179]
        previewElement.onload = () => URL.revokeObjectURL(previewElement.src); // 释放内存
    } else {
        // 对于PDF和ZIP，显示图标
        previewElement = document.createElement('div');
        previewElement.style.fontSize = '3rem';
        if (file.name.toLowerCase().endsWith('.pdf')) {
            previewElement.innerHTML = '📄'; [cite_start]// [cite: 181]
        } else if (file.name.toLowerCase().endsWith('.zip')) {
            previewElement.innerHTML = '📦'; [cite_start]// [cite: 183]
        }
    }
    previewElement.className = 'file-preview';
    filePreview.appendChild(previewElement);
    
    if (fileInfo) fileInfo.style.display = 'block'; [cite_start]// [cite: 183]
}

/**
 * 将生成的密码复制到剪贴板
 */
function copyPasswordToClipboard() {
    const passwordEl = document.getElementById('new-password');
    if (!passwordEl) return;
    
    const password = passwordEl.textContent;
    navigator.clipboard.writeText(password).then(() => {
        const btn = document.getElementById('copy-password');
        const originalText = btn.textContent;
        [cite_start]btn.textContent = '✓ 已复制'; // [cite: 117]
        btn.disabled = true; [cite_start]// [cite: 118]
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000); [cite_start]// [cite: 119]
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制。');
    });
}

/**
 * 切换密码输入框的可见性
 */
function togglePasswordVisibility() {
    const input = document.getElementById('password-input');
    const iconButton = document.getElementById('toggle-password');
    if (input.type === 'password') {
        input.type = 'text'; [cite_start]// [cite: 125]
        iconButton.textContent = '😑'; 
    } else {
        input.type = 'password'; [cite_start]// [cite: 126]
        iconButton.textContent = '👁️';
    }
}

/**
 * 切换夜间模式
 */
function toggleNightMode() {
    document.body.classList.toggle('night-mode');
    localStorage.setItem('nightMode', document.body.classList.contains('night-mode')); [cite_start]// [cite: 246]
}

/**
 * 检查本地存储并应用夜间模式
 */
function checkNightMode() {
    const isNightMode = localStorage.getItem('nightMode') === 'true'; [cite_start]// [cite: 255]
    if (isNightMode) {
        document.body.classList.add('night-mode'); [cite_start]// [cite: 256]
    }
}


// =================================================================================
// 核心业务逻辑 (上传、验证)
// =================================================================================

/**
 * 上传漫画文件
 */
async function uploadComic() {
    const fileInput = document.getElementById('comic-file');
    const uploadBtn = document.getElementById('upload-btn');
    
    // 验证输入
    if (!fileInput.files.length || !selectedBookcase) {
        alert('请选择书柜和文件'); [cite_start]// [cite: 185]
        return;
    }
    const file = fileInput.files[0];
    if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.zip')) {
        alert('仅支持PDF和ZIP格式的文件'); [cite_start]// [cite: 187]
        return;
    }
    
    // 更新UI为上传中状态
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('upload-progress');
    const progressText = document.getElementById('progress-text');
    if (progressContainer) progressContainer.style.display = 'block'; [cite_start]// [cite: 188]
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="loading-spinner"></span> 上传中...'; [cite_start]// [cite: 190]
    }
    
    try {
        [cite_start]// 调用GoFile上传，并传入进度回调 [cite: 191]
        const result = await uploadToGoFile(file, (progress) => {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `上传中: ${progress}%`;
        });
        
        // 上传成功后处理
        if (result && result.directLink) {
            // 将文件信息存入localStorage
            const bookcaseFiles = JSON.parse(localStorage.getItem(`bookcase_${selectedBookcase}_files`) || '[]');
            bookcaseFiles.push({
                fileId: result.fileId,
                name: result.fileName,
                directLink: result.directLink
            }); [cite_start]// [cite: 192]
            localStorage.setItem(`bookcase_${selectedBookcase}_files`, JSON.stringify(bookcaseFiles)); [cite_start]// [cite: 193]
            
            // 生成并更新密码
            const newPassword = generateRandomPassword(); [cite_start]// [cite: 193]
            await updateBookcasePassword(selectedBookcase, newPassword); [cite_start]// [cite: 194]
            publishNewPassword(selectedBookcase, newPassword); [cite_start]// [cite: 195]
            
            // 显示成功信息
            document.getElementById('selected-bookcase').textContent = selectedBookcase;
            document.getElementById('new-password').textContent = newPassword;
            document.getElementById('success-message').style.display = 'block'; [cite_start]// [cite: 198]
            
            // 隐藏上传表单
            document.getElementById('file-info').style.display = 'none'; [cite_start]// [cite: 199]
            if (progressContainer) progressContainer.style.display = 'none';
        } else {
            throw new Error('上传失败：未获取到有效的返回链接。'); [cite_start]// [cite: 202]
        }
    } catch (error) {
        console.error('上传错误:', error);
        alert('上传失败: ' + error.message); [cite_start]// [cite: 204]
    } finally {
        // 无论成功失败，都重置上传按钮状态
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.textContent = '上传漫画'; [cite_start]// [cite: 205]
        }
    }
}

/**
 * 验证用户输入的书柜密码
 */
async function verifyPassword() {
    const passwordInput = document.getElementById('password-input');
    const password = passwordInput.value;
    const errorMessage = document.getElementById('error-message');
    const verifyBtn = document.getElementById('verify-btn');

    // 格式验证
    if (!/^[A-Za-z0-9]{6}$/.test(password)) {
        errorMessage.textContent = "密码必须是6位字母或数字组合";
        errorMessage.style.display = 'block'; [cite_start]// [cite: 207, 208]
        return;
    }
    
    // UI进入验证中状态
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<span class="loading-spinner"></span> 验证中...'; [cite_start]// [cite: 211]
    }
    if (errorMessage) errorMessage.style.display = 'none';

    try {
        const storedPassword = await getBookcasePassword(selectedBookcase); [cite_start]// [cite: 211]
        
        if (password === storedPassword) {
            // 密码正确
            if (errorMessage) errorMessage.style.display = 'none'; [cite_start]// [cite: 212]
            
            // 显示漫画查看器
            document.getElementById('password-section').style.display = 'none'; [cite_start]// [cite: 213]
            document.getElementById('comic-viewer').style.display = 'block'; [cite_start]// [cite: 214]
            enableKeyboardNavigation(); [cite_start]// 启用键盘控制 [cite: 215]
            
            // 获取并显示漫画
            const comics = await getComicsInBookcase(selectedBookcase); [cite_start]// [cite: 216]
            if (comics.length > 0) {
                currentComic = comics[0]; [cite_start]// 默认显示第一个 [cite: 217]
                displayComic(currentComic); [cite_start]// [cite: 218]
                
                // 显示当前密码并订阅更新
                document.getElementById('current-password').textContent = storedPassword; [cite_start]// [cite: 219]
                subscribeToPasswordUpdates(selectedBookcase, (message) => {
                    const newPassword = message.data;
                    currentBookcasePassword = newPassword;
                    [cite_start]document.getElementById('current-password').textContent = newPassword; // [cite: 220]
                    
                    const updateIndicator = document.getElementById('password-update-indicator');
                    if (updateIndicator) {
                        updateIndicator.textContent = '(已更新)';
                        updateIndicator.style.display = 'inline-block'; [cite_start]// [cite: 221]
                        setTimeout(() => {
                            [cite_start]if (updateIndicator) updateIndicator.style.display = 'none'; // [cite: 224]
                        }, 5000);
                    }
                    localStorage.setItem(`bookcase_${selectedBookcase}_password`, newPassword); [cite_start]// 更新本地存储 [cite: 222]
                });
            } else {
                alert('该书柜中没有漫画');
                closeViewer(); [cite_start]// [cite: 225]
            }
        } else {
            // 密码错误
            errorMessage.textContent = "密码错误，请重新输入";
            errorMessage.style.display = 'block'; [cite_start]// [cite: 226]
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus(); [cite_start]// [cite: 227]
            }
        }
    } catch (error) {
        console.error('验证密码错误:', error);
        alert('验证失败，请重试'); [cite_start]// [cite: 228]
    } finally {
        // 重置验证按钮
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.textContent = '验证密码'; [cite_start]// [cite: 229]
        }
    }
}

// =================================================================================
// 漫画查看器逻辑
// =================================================================================

/**
 * 根据漫画类型（PDF/ZIP）显示内容
 */
function displayComic(comic) {
    document.getElementById('comic-title').textContent = comic.name; [cite_start]// [cite: 229]
    const pdfViewer = document.getElementById('pdf-viewer');
    const zipViewer = document.getElementById('zip-viewer');

    // 重置状态
    currentPage = 1; [cite_start]// [cite: 234]
    currentZoom = 1.0;
    currentRotation = 0;

    if (comic.format === 'pdf') {
        if (pdfViewer) pdfViewer.style.display = 'block'; [cite_start]// [cite: 231]
        if (zipViewer) zipViewer.style.display = 'none';
        displayPDF(comic.url); [cite_start]// [cite: 232]
    } else if (comic.format === 'zip') {
        if (pdfViewer) pdfViewer.style.display = 'none';
        if (zipViewer) zipViewer.style.display = 'block'; [cite_start]// [cite: 233]
        displayZIP(comic.url);
    }
    
    updateComicDisplay(); [cite_start]// [cite: 234]
}

/**
 * 更新漫画阅读器的显示状态（页码、缩放等）
 */
function updateComicDisplay() {
    // 更新UI文本
    document.getElementById('page-counter').textContent = `${currentPage}/${totalPages}`; [cite_start]// [cite: 235]
    document.getElementById('zoom-percent').textContent = `${Math.round(currentZoom * 100)}%`;
    
    // 更新翻页按钮状态
    document.getElementById('prev-page').disabled = currentPage <= 1; [cite_start]// [cite: 236]
    document.getElementById('next-page').disabled = currentPage >= totalPages; [cite_start]// [cite: 237]
    
    // 应用缩放和旋转
    const canvas = document.getElementById('pdf-canvas');
    const image = document.getElementById('comic-image');
    if (canvas) canvas.style.transform = `scale(${currentZoom}) rotate(${currentRotation}deg)`; [cite_start]// [cite: 238]
    if (image) image.style.transform = `scale(${currentZoom}) rotate(${currentRotation}deg)`; [cite_start]// [cite: 240]
    
    // 根据漫画类型更新页面内容
    if (currentComic?.format === 'pdf') {
        displayCurrentPDFPage(); [cite_start]// PDF需要重新渲染当前页 [cite: 241]
    } else if (currentComic?.format === 'zip') {
        if (currentComic.pages && currentComic.pages[currentPage - 1]) {
            displayImage(currentComic.pages[currentPage - 1]); [cite_start]// ZIP直接显示对应图片 [cite: 242]
        }
    }
    updateReaderProgress(); [cite_start]// [cite: 234]
}

/**
 * 控制上一页
 */
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        updateComicDisplay(); [cite_start]// [cite: 135]
    }
}

/**
 * 控制下一页
 */
function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        updateComicDisplay(); [cite_start]// [cite: 136]
    }
}

/**
 * 放大
 */
function zoomIn() {
    if (currentZoom < 3.0) { // 限制最大缩放
        currentZoom += 0.25;
        updateComicDisplay(); [cite_start]// [cite: 137]
    }
}

/**
 * 缩小
 */
function zoomOut() {
    if (currentZoom > 0.25) { // 限制最小缩放
        currentZoom -= 0.25;
        updateComicDisplay(); [cite_start]// [cite: 138]
    }
}

/**
 * 旋转
 */
function rotateComic() {
    currentRotation = (currentRotation + 90) % 360;
    updateComicDisplay(); [cite_start]// [cite: 139]
}

/**
 * 适应屏幕
 */
function fitComicToScreen() {
    if (!currentComic) return;
    const container = document.querySelector('.viewer-container'); [cite_start]// [cite: 139]
    if (!container) return;

    const containerWidth = container.clientWidth - 40; [cite_start]// [cite: 140]
    const containerHeight = container.clientHeight - 40;

    if (currentComic.format === 'pdf') {
        const canvas = document.getElementById('pdf-canvas');
        if (!canvas) return;
        const scaleX = containerWidth / canvas.width;
        const scaleY = containerHeight / canvas.height;
        currentZoom = Math.min(scaleX, scaleY); [cite_start]// [cite: 142]
    } else if (currentComic.format === 'zip') {
        const image = document.getElementById('comic-image');
        if (!image || !image.naturalWidth) return;
        const scaleX = containerWidth / image.naturalWidth;
        const scaleY = containerHeight / image.naturalHeight;
        currentZoom = Math.min(scaleX, scaleY); [cite_start]// [cite: 145]
    }
    updateComicDisplay();
}

/**
 * 切换全屏模式
 */
function toggleFullscreen() {
    const viewerContainer = document.querySelector('.viewer-container');
    if (!document.fullscreenElement) {
        if (viewerContainer) {
            viewerContainer.requestFullscreen().catch(err => {
                [cite_start]alert(`无法进入全屏模式: ${err.message}`); // [cite: 244]
            });
        }
    } else {
        document.exitFullscreen(); [cite_start]// [cite: 245]
    }
}

/**
 * 关闭查看器，返回密码输入界面
 */
function closeViewer() {
    document.getElementById('comic-viewer').style.display = 'none';
    document.getElementById('password-section').style.display = 'block';
    disableKeyboardNavigation(); [cite_start]// [cite: 134]
}

/**
 * 更新页面底部的阅读进度条
 */
function updateReaderProgress() {
    const progressBar = document.querySelector('.reader-progress-bar');
    if (progressBar && totalPages > 0) {
        const progress = (currentPage / totalPages) * 100;
        progressBar.style.width = `${progress}%`; [cite_start]// [cite: 249]
    }
}

/**
 * 启用键盘快捷键
 */
function enableKeyboardNavigation() {
    if (keyboardListenerActive) return;
    document.addEventListener('keydown', handleKeyDown); [cite_start]// [cite: 146]
    keyboardListenerActive = true;
}

/**
 * 禁用键盘快捷键
 */
function disableKeyboardNavigation() {
    document.removeEventListener('keydown', handleKeyDown); [cite_start]// [cite: 147]
    keyboardListenerActive = false;
}

/**
 * 处理键盘按键事件的函数
 */
function handleKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; [cite_start]// [cite: 148]

    // 快捷键映射
    const keyMap = {
        [cite_start]'ArrowLeft': prevPage,      // [cite: 149]
        [cite_start]'ArrowRight': nextPage,     // [cite: 150]
        [cite_start]'+': zoomIn,                // [cite: 151]
        '=': zoomIn,
        [cite_start]'-': zoomOut,               // [cite: 152]
        '_': zoomOut,
        [cite_start]'f': toggleFullscreen,      // [cite: 153]
        [cite_start]'r': rotateComic,           // [cite: 154]
        [cite_start]'0': fitComicToScreen,      // [cite: 155]
        [cite_start]'n': toggleNightMode,       // [cite: 159]
    };

    if (keyMap[e.key]) {
        e.preventDefault();
        keyMap[e.key]();
    } else if (e.key === 'Escape') {
        if (document.fullscreenElement) {
            document.exitFullscreen(); [cite_start]// [cite: 156]
        } else {
            closeViewer(); [cite_start]// [cite: 157]
        }
    }
}


// =================================================================================
// 工具函数
// =================================================================================

/**
 * 生成一个6位的随机字母数字密码
 * @returns {string} 随机密码
 */
function generateRandomPassword() {
    const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let password = "";
    for (let i = 0; i < 6; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length)); [cite_start]// [cite: 250]
    }
    return password; [cite_start]// [cite: 251]
}

/**
 * 从本地存储获取指定书柜的密码
 * @param {string} bookcaseId - 书柜ID
 * @returns {Promise<string>} 密码
 */
async function getBookcasePassword(bookcaseId) {
    try {
        return localStorage.getItem(`bookcase_${bookcaseId}_password`) || '123456'; [cite_start]// [cite: 251, 252]
    } catch (error) {
        console.error('获取书柜密码错误:', error);
        throw error; [cite_start]// [cite: 253]
    }
}

/**
 * 更新本地存储中指定书柜的密码
 * @param {string} bookcaseId - 书柜ID
 * @param {string} newPassword - 新密码
 * @returns {Promise<boolean>} 是否成功
 */
async function updateBookcasePassword(bookcaseId, newPassword) {
    try {
        localStorage.setItem(`bookcase_${bookcaseId}_password`, newPassword); [cite_start]// [cite: 253]
        return true; [cite_start]// [cite: 254]
    } catch (error) {
        console.error('更新书柜密码错误:', error);
        throw error; [cite_start]// [cite: 255]
    }
}