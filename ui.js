// js/ui.js - UI 渲染與 Chart.js 繪圖 (模組化)
import { GAME_STATE } from './model.js'; // 導入模型狀態

let economicChartInstance = null;

export function setNews(message, isWarning = false) {
    const newsTicker = document.getElementById('news-ticker');
    newsTicker.textContent = message;
    newsTicker.style.color = isWarning ? '#dc3545' : '#343a40'; 
    newsTicker.style.fontWeight = 'bold';
    // 更新背景色以增加視覺衝擊
    document.getElementById('message-section').style.backgroundColor = isWarning ? '#f8d7da' : '#d4edda';
    document.getElementById('message-section').style.color = isWarning ? '#721c24' : '#155724';
}

export function updateUI(rateAdjustment) {
    // 1. 更新回合標題
    document.getElementById('turn-header').textContent = 
        `決策介面 (回合: ${GAME_STATE.currentDate.toISOString().substring(0, 7)})`;
    
    // 2. 更新經濟指標
    document.getElementById('currentRateDisplay').textContent = `${GAME_STATE.currentRate.toFixed(2)}%`;
    document.getElementById('cpi-display').textContent = `${GAME_STATE.cpi.toFixed(2)}%`;
    document.getElementById('unemployment-display').textContent = `${GAME_STATE.unemployment.toFixed(2)}%`;
    document.getElementById('gdp-display').textContent = `${GAME_STATE.gdpGrowth.toFixed(2)}%`;
    
    // 3. 更新信譽度
    document.getElementById('credibility-display').textContent = `${GAME_STATE.credibility.toFixed(0)}/100`;

    // 4. 更新市場情緒
    let sentimentText = "中立 🟡";
    if (GAME_STATE.marketSentiment > 30) sentimentText = "極度貪婪 🚀🚀";
    else if (GAME_STATE.marketSentiment > 10) sentimentText = "樂觀 📈";
    else if (GAME_STATE.marketSentiment < -30) sentimentText = "極度恐懼 💣💣";
    else if (GAME_STATE.marketSentiment < -10) sentimentText = "擔憂 📉";
    
    document.getElementById('market-sentiment-display').textContent = sentimentText;
    
    // 5. 更新滑桿顯示
    const rateInput = document.getElementById('rate-slider');
    const targetAdjustment = (parseFloat(rateInput.value) / 100).toFixed(2);
    document.getElementById('rate-adjustment-display').textContent = `${targetAdjustment}% (調整量)`;
}

export function drawCombinedChart() {
    const ctx = document.getElementById('economicChart').getContext('2d');
    
    const labels = GAME_STATE.history.map(item => item.date);
    const rates = GAME_STATE.history.map(item => item.rate);
    const cpiValues = GAME_STATE.history.map(item => item.cpi);
    const unempValues = GAME_STATE.history.map(item => item.unemployment);

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
                { label: '失業率 (%)', data: unempValues, yAxisID: 'y3', borderColor: 'rgb(54, 162, 235)', borderWidth: 2, pointRadius: 1, fill: false, tension: 0.3 }
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
                y3: { type: 'linear', display: true, position: 'right', title: { display: true, text: '失業率 (%)' }, suggestedMin: 2, suggestedMax: 10, grid: { drawOnChartArea: false } }
            },
            plugins: {
                title: { display: true, text: '利率、通脹與失業率趨勢' }
            }
        }
    });
}
