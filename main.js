// main.js - 遊戲主入口與流程控制 (V9.0)

import { GAME_STATE, initializeModel, nextTurnModel } from './model.js'; // V9.0 移除 handleTransaction
import { updateUI, drawCombinedChart, setNews } from './ui.js'; 

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
        // V9.0: 成功邏輯 (保持不變)
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
        // V9.0: 備用機制 - 使用靜態數據啟動遊戲 (解決 API 無法連接問題)
        const START_RATE = 4.25;
        const START_CPI = 3.0;
        const START_UNEMP = 4.0;
        
        console.error("初始化失敗，無法從 FRED API 獲取必要數據。遊戲已切換至備用靜態模式。");
        
        initializeModel(START_RATE, START_CPI, START_UNEMP);
        
        // 確保歷史記錄至少有一個點
        GAME_STATE.history.push({
            date: "2024-01-01", 
            rate: START_RATE, 
            cpi: START_CPI, 
            unemployment: START_UNEMP, 
            gdpGrowth: 2.0, 
            sentiment: 0, 
            stockIndex: GAME_STATE.stockIndex, 
            portfolio: GAME_STATE.playerPortfolio,
        });
        
        drawCombinedChart();
        updateUI(0);
        setNews('⚠️ 數據服務中斷：遊戲已啟動模擬模式 (使用靜態初始值)。請發布第一個決策。', true);
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
    
    // V9.0: 移除交易回饋 (交易介面已移除) 
    
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

// V9.0: 移除 handleTrading 函數

// --- 綁定 UI 事件 ---

document.addEventListener('DOMContentLoaded', () => {
    const rateInput = document.getElementById('rate-slider');
    const commitBtn = document.getElementById('commit-decision');

    rateInput.addEventListener('input', () => {
        const rateAdjustment = parseFloat(rateInput.value) / 100; 
        updateUI(rateAdjustment); 
        
        const targetRate = GAME_STATE.currentRate + rateAdjustment;
        setNews(`💡 預計調整後利率為: ${targetRate.toFixed(2)}%`);
    });

    commitBtn.addEventListener('click', handleNextTurn);
    
    // V9.0: 移除交易按鈕的事件綁定
    
    initializeGame();
});
