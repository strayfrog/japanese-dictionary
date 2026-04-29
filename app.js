document.addEventListener('DOMContentLoaded', async () => {
    // Apply glassmorphism classes
    document.querySelector('.sidebar').classList.add('glass');
    document.querySelector('.main-content').classList.add('glass');

    const wordListEl = document.getElementById('wordList');
    const searchInput = document.getElementById('searchInput');
    const contentTitle = document.getElementById('contentTitle');
    const contentBody = document.getElementById('contentBody');

    let dictionaryData = [];
    const order = ['あ行', 'か行', 'さ行', 'た行', 'な行', 'は行', 'ま行', 'や行', 'ら行', 'わ行', 'その他'];

    // Load data
    try {
        const response = await fetch('dictionary.json');
        dictionaryData = await response.json();
        renderGroupedList(dictionaryData);
    } catch (error) {
        console.error('Error loading dictionary data:', error);
        contentTitle.textContent = '載入資料失敗';
        contentBody.textContent = '無法讀取 dictionary.json，請確認檔案是否存在。';
    }

    function getRowCategory(word) {
        if (!word) return 'その他';
        
        let stripped = word.replace(/^[\.…・\-\~\(\)\[\]【】\s]+/g, '');
        if (!stripped) return 'その他';
        
        let firstChar = stripped.charAt(0);
        // Handle known kanji exceptions based on the dictionary
        if (firstChar === '差') firstChar = 'さ';
        
        const categories = [
            { name: 'あ行', chars: 'あいうえおぁぃぅぇぉアイウエオァィゥェォ' },
            { name: 'か行', chars: 'かきくけこがぎぐげごカキクケコガギグゲゴ' },
            { name: 'さ行', chars: 'さしすせそざじずぜぞサシスセソザジズゼゾ' },
            { name: 'た行', chars: 'たちつてとだぢづでどっタチツテトダヂヅデドッ' },
            { name: 'な行', chars: 'なにぬねのナニヌネノ' },
            { name: 'は行', chars: 'はひふへほばびぶべぼぱぴぷぺぽハヒフヘホバビブベボパピプペポ' },
            { name: 'ま行', chars: 'まみむめもマミムメモ' },
            { name: 'や行', chars: 'やゆよゃゅょヤユヨャュョ' },
            { name: 'ら行', chars: 'らりるれろラリルレロ' },
            { name: 'わ行', chars: 'わをんゎワヲンヮ' }
        ];
        
        for (const cat of categories) {
            if (cat.chars.includes(firstChar)) {
                return cat.name;
            }
        }
        return 'その他';
    }

    function createWordItem(entry, index) {
        const item = document.createElement('div');
        item.className = 'word-item fade-in';
        item.style.animationDelay = `${Math.min(index * 0.01, 0.2)}s`;
        
        const previewText = entry.content.split('\n').find(line => line.trim().length > 0)?.substring(0, 30) + '...' || '...';
        
        item.innerHTML = `
            <div class="word-title">【${entry.word}】</div>
            <div class="word-preview">${escapeHtml(previewText)}</div>
        `;
        
        item.addEventListener('click', () => {
            document.querySelectorAll('.word-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            displayContent(entry);
        });
        
        return item;
    }

    function renderGroupedList(data) {
        wordListEl.innerHTML = '';
        
        const groupedData = {};
        order.forEach(row => groupedData[row] = []);
        
        data.forEach(entry => {
            const row = getRowCategory(entry.word);
            if(groupedData[row]) groupedData[row].push(entry);
            else groupedData['その他'].push(entry);
        });
        
        for (const row of order) {
            const entries = groupedData[row];
            if (!entries || entries.length === 0) continue;
            
            const groupEl = document.createElement('div');
            groupEl.className = 'accordion-group fade-in';
            
            const headerEl = document.createElement('div');
            headerEl.className = 'accordion-header';
            headerEl.innerHTML = `<div class="accordion-title"><h3>${row}</h3> <span class="count">(${entries.length})</span></div> <span class="arrow">▼</span>`;
            
            const contentEl = document.createElement('div');
            contentEl.className = 'accordion-content';
            
            entries.forEach((entry, index) => {
                const item = createWordItem(entry, index);
                contentEl.appendChild(item);
            });
            
            headerEl.addEventListener('click', () => {
                headerEl.classList.toggle('open');
                contentEl.classList.toggle('open');
            });
            
            groupEl.appendChild(headerEl);
            groupEl.appendChild(contentEl);
            wordListEl.appendChild(groupEl);
        }
    }

    function renderFlatList(data) {
        wordListEl.innerHTML = '';
        data.forEach((entry, index) => {
            const item = createWordItem(entry, index);
            wordListEl.appendChild(item);
        });
    }

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    function processContent(content) {
        const lines = content.split('\n');
        let html = '';
        let pendingFuriganaLine = null;
        let pendingFuriganaChunks = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const safeLine = escapeHtml(line);
            
            const hasKanji = /[\u4E00-\u9FAF\u3005]/.test(line);
            const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(line);
            const hasSpaces = /[ \u3000]/.test(line);
            
            const isGrammarPoint = /^([0-9０-９]+|[a-zA-Zａ-ｚＡ-Ｚ]+)\s*[﹑、\.,．]/.test(line.trim());
            const isExample = /^[\(（][0-9０-９]+[\)）]/.test(line.trim());
            
            // Detect Furigana Line: No kanji, has kana, contains formatting spaces, not grammar/example
            if (!hasKanji && hasKana && hasSpaces && !isGrammarPoint && !isExample) {
                pendingFuriganaLine = safeLine;
                pendingFuriganaChunks = line.split(/[ \u3000]+/).filter(s => s.trim().length > 0);
                continue;
            }
            
            let lineClass = "normal-line";
            if (isGrammarPoint) lineClass = "grammar-point";
            else if (isExample) lineClass = "example-sentence";
            
            let processedLine = safeLine;
            
            if (pendingFuriganaChunks) {
                // Try to pair with kanji in this line
                const kanjiRegex = /[\u4E00-\u9FAF\u3005]+/g;
                const matches = [...line.matchAll(kanjiRegex)];
                
                if (matches.length === pendingFuriganaChunks.length && matches.length > 0) {
                    // Perfect match, use Ruby tags!
                    let chunkIndex = 0;
                    processedLine = safeLine.replace(/[\u4E00-\u9FAF\u3005]+/g, (match) => {
                        const furi = pendingFuriganaChunks[chunkIndex];
                        chunkIndex++;
                        return `<ruby>${match}<rt>${escapeHtml(furi)}</rt></ruby>`;
                    });
                } else {
                    // Fallback to visual spacing rendering
                    let fallbackHtml = '';
                    for (let j = 0; j < pendingFuriganaLine.length; j++) {
                        const c = pendingFuriganaLine[j];
                        if (c === ' ' || c === '　') {
                            fallbackHtml += c;
                        } else {
                            fallbackHtml += `<span class="furigana-char">${c}</span>`;
                        }
                    }
                    html += `<div class="furigana-line">${fallbackHtml}</div>`;
                }
                pendingFuriganaChunks = null;
                pendingFuriganaLine = null;
            }
            
            html += `<div class="${lineClass}">${processedLine}</div>`;
        }
        
        if (pendingFuriganaChunks) {
            let fallbackHtml = '';
            for (let j = 0; j < pendingFuriganaLine.length; j++) {
                const c = pendingFuriganaLine[j];
                if (c === ' ' || c === '　') fallbackHtml += c;
                else fallbackHtml += `<span class="furigana-char">${c}</span>`;
            }
            html += `<div class="furigana-line">${fallbackHtml}</div>`;
        }
        
        return html;
    }

    function displayContent(entry) {
        contentTitle.textContent = `【${entry.word}】`;
        contentBody.classList.remove('fade-in');
        
        setTimeout(() => {
            contentBody.innerHTML = processContent(entry.content);
            contentBody.classList.add('fade-in');
        }, 10);
    }

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        if (!searchTerm) {
            renderGroupedList(dictionaryData);
            return;
        }

        const filteredData = dictionaryData.filter(entry => {
            return entry.word.toLowerCase().includes(searchTerm) || 
                   entry.content.toLowerCase().includes(searchTerm);
        });

        renderFlatList(filteredData);
    });
});
