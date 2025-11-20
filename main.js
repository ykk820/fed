// main.js - 遊戲主入口與流程控制 (V8.0)

import { GAME_STATE, initializeModel, nextTurnModel, handleTransaction } from './model.js'; 
import { updateUI, drawCombinedChart, setNews, setTransactionFeedback } from './ui.js'; 

// --- FRED API 獲取 (保持不變) ---
const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations";
const DATA_SERIES = {
    FED_RATE: 'FEDFUNDS', 
    CPI: 'CPIAUCSL',      
    UNEMPLOYMENT: 'UNRATE', 
};
const START_DATE = '2022-01-01';

async function getFredData(seriesId) {
    if (typeof FRED_API_KEY === 'undefined') {
        console.error("錯誤：FRED_API_KEY 未定義。請檢查 api-keys.js 檔案或 Vercel 環境變數。");
        return null;
    }
    const url = `${FRED_BASE_URL}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${START_DATE}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        const observations = data.observations
            .filter(obs => obs.value !== '.')
            .map(obs => ({
                date: obs.date,
                value: parseFloat(obs.value)
            }));
        return observations;
    } catch (error) {
        console.error(`獲取 ${seriesId} 數據時發生錯誤:`, error);
        return null;
    }
}

// --- 遊戲流程控制 ---

async function initializeGame() {
    setNews('正在從 FRED 獲取歷史數據... 📶');
    
    const [fedRateData, cpiData, unempData] = await Promise.all([
        getFredData(DATA_SERIES.FED_RATE),
        getFredData(DATA_SERIES.CPI),
        getFredData(DATA_SERIES.UNEMPLOYMENT)
    ]);
    
    if (fedRateData && cpiData && unempData) {
        const lastRate = fedRateData[fedRateData.length - 1].value;
        const lastCPI = cpiData[cpiData.length - 1].value;
        const lastUnemp = unempData[unempData.length - 1].value;

        initializeModel(lastRate, lastCPI, lastUnemp);
        
        GAME_STATE.history = fedRateData.map(d => {
            const cpiItem = cpiData.find(c => c.date === d.date);
            const unempItem = unempData.find(u => u.date === d.date);
            return {
                date: d.date,
                rate: d.value,
                cpi: cpiItem ? cpiItem.value : lastCPI,
                unemployment: unempItem ? unempItem.value : lastUnemp,
                gdpGrowth: 2.0, 
                sentiment: 0
            };
        });
        
        drawCombinedChart();
        updateUI(0); 
        setNews('🚀 遊戲初始化完成！您現在是聯儲主席，請發布您的第一個決策。');

    } else {
        // V8.0: 修正錯誤提示，提供更友善、更具體的資訊
        console.error("初始化失敗，無法從 FRED API 獲取必要數據。請檢查網路連接或 API Key 是否有效。");
        setNews('❌ 初始化失敗：無法連接至外部經濟數據服務。請檢查您的網路連線或 API Key (3d7072fc1b5ebe22c5c34dac7ac5f308) 是否仍有效。遊戲無法啟動。', true);
    }
}

function handleNextTurn() {
    if (GAME_STATE.credibility <= 0) {
        alert("💥 聯儲信譽度歸零！您因嚴重失職被國會解職。遊戲結束！");
        return; 
    }
    
    const rateInput = document.getElementById('rate-slider');
    const rateAdjustment = parseFloat(rateInput.value) / 100;
    
    const { credibilityDelta, eventTriggered } = nextTurnModel(rateAdjustment);
    
    setTransactionFeedback('等待交易指令...'); 
    
    // --- 新聞優先級處理 ---
    if (eventTriggered) {
        const { news, isWarning } = GAME_STATE.currentShock;
        setNews(news, isWarning);
    
    } else {
        if (Math.abs(rateAdjustment) > 0.5) {
            setNews('🚨 突發新聞：聯儲突然大幅調整利率，市場恐慌！', true);
        } else if (rateAdjustment === 0) {
            setNews('🤔 聯儲維持利率不變。市場正在觀望... ');
        } else if (credibilityDelta < 0) {
             setNews('⚠️ 市場對聯儲政策表示失望，信譽度下降。', true);
        } else if (credibilityDelta > 0) {
            setNews('👍 聯儲政策穩健，信譽度提升！');
        } else {
             setNews('✅ 政策已發布。市場正在消化中...');
        }
    }
    
    // 更新 UI 
    updateUI(rateAdjustment);
    drawCombinedChart();
    
    // 重設滑桿
    rateInput.value = 0; 
}


function handleTrading(type) {
    const quantityInput = document.getElementById('trade-quantity');
    let quantity = parseInt(quantityInput.value);
    
    if (isNaN(quantity) || quantity <= 0) {
        setTransactionFeedback('❌ 交易失敗：請輸入有效的正整數股數。', false);
        return;
    }

    const { message, isSuccess } = handleTransaction(type, quantity);
    
    setTransactionFeedback(message, isSuccess);
    
    if (isSuccess) {
        quantityInput.value = '';
    }
    
    updateUI(0); 
}


// --- 綁定 UI 事件 ---

document.addEventListener('DOMContentLoaded', () => {
    const rateInput = document.getElementById('rate-slider');
    const commitBtn = document.getElementById('commit-decision');
    const buyBtn = document.getElementById('buy-btn');
    const sellBtn = document.getElementById('sell-btn');


    rateInput.addEventListener('input', () => {
        const rateAdjustment = parseFloat(rateInput.value) / 100; 
        updateUI(rateAdjustment); 
        
        const targetRate = GAME_STATE.currentRate + rateAdjustment;
        setNews(`💡 預計調整後利率為: ${targetRate.toFixed(2)}%`);
    });

    commitBtn.addEventListener('click', handleNextTurn);
    
    buyBtn.addEventListener('click', () => handleTrading('buy'));
    sellBtn.addEventListener('click', () => handleTrading('sell'));
    
    initializeGame();
});
