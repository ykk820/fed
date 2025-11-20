// ui.js - UI 渲染與 Chart.js 繪圖 (V11.0)
import { GAME_STATE } from './model.js'; 

let economicChartInstance = null;

function renderChangeIndicator(currentValue, previousValue, elementId) {
    const change = currentValue - previousValue;
    // V11.0: 避免除以零錯誤
    if (previousValue === 0 || isNaN(previousValue)) {
         if (currentValue > 0) previousValue = 1; else previousValue = 1000;
    }

    const percentChange = (change / previousValue) * 100;
    const indicatorEl = document.getElementById(elementId);

    let symbol = '';
    let className = 'neutral';
    
    if (percentChange > 0.05) {
        symbol = '▲';
        className = 'positive';
    } else if (percentChange < -0.05) {
        symbol = '▼';
        className = 'negative';
    } else {
        symbol = '—';
        className = 'neutral';
    }

    indicatorEl.textContent = `${symbol} ${percentChange.toFixed(2)}%`;
    indicatorEl.className = `change-indicator ${className}`;
}


export function setNews(message, isWarning = false) {
    const newsTicker = document.getElementById('news-ticker');
    newsTicker.textContent = message;
    newsTicker.style.color = isWarning ? 'var(--danger-color)' : 'var(--primary-color)'; 
    newsTicker.style.fontWeight = isWarning ? 'bold' : 'normal';
    
    const newsPanel = document.getElementById('message-section');
    newsPanel.style.border = isWarning ? `1px solid var(--danger-color)` : `1px solid var(--border-color)`;
}


export function updateUI(rateAdjustment) {
    document.getElementById('turn-header').textContent = 
        `決策介面 (回合: ${GAME_STATE.currentDate.toISOString().substring(0, 7)})`;
    
    // 經濟指標
    document.getElementById('currentRateDisplay').textContent = `${GAME_STATE.currentRate.toFixed(2)}%`;
    document.getElementById('cpi-display').textContent = `${GAME_STATE.cpi.toFixed(2)}%`;
    document.getElementById('unemployment-display').textContent = `${GAME_STATE.unemployment.toFixed(2)}%`;
    document.getElementById('gdp-display').textContent = `${GAME_STATE.gdpGrowth.toFixed(2)}%`;
    
    // 股市指數顯示
    document.getElementById('stock-index-display').textContent = `${GAME_STATE.stockIndex.toFixed(0)}`;
    
    // V11.0：券商動態顯示
    const brokerageFlowEl = document.getElementById('brokerage-flow');
    const flow = GAME_STATE.brokerageFlow;
    
    brokerageFlowEl.textContent = flow > 0 ? `淨買入 +${flow}` : `淨賣出 ${flow}`;
    brokerageFlowEl.style.color = flow > 0 ? 'var(--success-color)' : 'var(--danger-color)';

    // V11.0：股市漲跌幅
    renderChangeIndicator(GAME_STATE.stockIndex, GAME_STATE.previousStockIndex, 'stock-change');
    
    // 更新交易介面價格
    document.getElementById('current-index-price').textContent = GAME_STATE.stockIndex.toFixed(2);

    // V11.0：信譽度和情緒顯示
    document.getElementById('credibility-display').textContent = `${GAME_STATE.credibility.toFixed(0)}/100`;

    let sentimentText = "中立 🟡";
    if (GAME_STATE.marketSentiment > 30) sentimentText = "極度貪婪 🚀🚀";
    else if (GAME_STATE.marketSentiment > 10) sentimentText = "樂觀 📈";
    else if (GAME_STATE.marketSentiment < -30) sentimentText = "極度恐懼 💣💣";
    else if (GAME_STATE.marketSentiment < -10) sentimentText = "擔憂 📉";
    
    document.getElementById('market-sentiment-display').textContent = sentimentText;
    
    // 基準利率調整的 UX
    const rateInput = document.getElementById('rate-slider');
    const rateDisplay = document.getElementById('rate-adjustment-display');
    const targetAdjustment = (parseFloat(rateInput.value) / 100).toFixed(2);

    rateDisplay.textContent = `${targetAdjustment}% (調整量)`;

    if (parseFloat(targetAdjustment) > 0) {
        rateDisplay.className = 'large-value positive-adjust'; 
    } else if (parseFloat(targetAdjustment) < 0) {
        rateDisplay.className = 'large-value negative-adjust'; 
    } else {
        rateDisplay.className = 'large-value zero-adjust'; 
    }
}

export function drawCombinedChart() {
    const ctx = document.getElementById('economicChart').getContext('2d');
    
    const labels = GAME_STATE.history.map(item => item.date);
    const rates = GAME_STATE.history.map(item => item.rate);
    const cpiValues = GAME_STATE.history.map(item => item.cpi);
    const unempValues = GAME_STATE.history.map(item => item.unemployment);
    const stockIndexValues = GAME_STATE.history.map(item => item.stockIndex); 
    // V11.0 移除 portfolioValues

    if (economicChartInstance) {
        economicChartInstance.destroy();
    }

    economicChartInstance = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: labels,
            datasets: [
                { label: '利率 (%)', data: rates, yAxisID: 'y1', borderColor: 'rgb(75, 192, 192)', borderWidth: 2, pointRadius: 1, tension: 0.3 },
                { label: '通脹 CPI (%)', data: cpiValues, yAxisID: 'y2', borderColor: 'rgb(255, 99, 132)', borderWidth: 2, pointRadius: 1, fill: false, tension: 0.3 },
                { label: '失業率 (%)', data: unempValues, yAxisID: 'y3', borderColor: 'rgb(54, 162, 235)', borderWidth: 2, pointRadius: 1, fill: false, tension: 0.3 },
                { label: '股市指數', data: stockIndexValues, yAxisID: 'y4', borderColor: 'rgb(40, 167, 69)', borderWidth: 2, pointRadius: 1, fill: false, tension: 0.3 },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false, },
            scales: {
                x: { title: { display: true, text: '日期' } },
                y1: { type: 'linear', display: true, position: 'left', title: { display: true, text: '利率 (%)' }, suggestedMin: 0, suggestedMax: 8 },
                y2: { type: 'linear', display: true, position: 'right', title: { display: true, text: '通脹 CPI (%)' }, suggestedMin: 0, suggestedMax: 10, grid: { drawOnChartArea: false } },
                y3: { type: 'linear', display: true, position: 'right', title: { display: true, text: '失業率 (%)' }, suggestedMin: 2, suggestedMax: 10, grid: { drawOnChartArea: false } },
                y4: { type: 'linear', display: true, position: 'left', title: { display: true, text: '股市指數' }, suggestedMin: 1000, suggestedMax: 8000, grid: { drawOnChartArea: false } },
            },
            plugins: {
                title: { display: true, text: '宏觀指標與股市趨勢' }
            }
        }
    });
}
