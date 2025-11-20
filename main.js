// js/main.js - 遊戲主入口與流程控制 (模組化)

import { GAME_STATE, initializeModel, nextTurnModel } from './model.js';
import { updateUI, drawCombinedChart, setNews } from './ui.js';

// --- FRED API 獲取 ---
const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations";
const DATA_SERIES = {
    FED_RATE: 'FEDFUNDS', 
    CPI: 'CPIAUCSL',      
    UNEMPLOYMENT: 'UNRATE', // 新增失業率數據
};
const START_DATE = '2022-01-01';

async function getFredData(seriesId) {
    if (typeof FRED_API_KEY === 'undefined') {
        console.error("錯誤：FRED_API_KEY 未定義。請檢查 api-keys.js 檔案。");
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
    
    // 同時獲取三組數據
    const [fedRateData, cpiData, unempData] = await Promise.all([
        getFredData(DATA_SERIES.FED_RATE),
        getFredData(DATA_SERIES.CPI),
        getFredData(DATA_SERIES.UNEMPLOYMENT)
    ]);
    
    if (fedRateData && cpiData && unempData) {
        const lastRate = fedRateData[fedRateData.length - 1].value;
        const lastCPI = cpiData[cpiData.length - 1].value;
        const lastUnemp = unempData[unempData.length - 1].value;

        // 初始化模型
        initializeModel(lastRate, lastCPI, lastUnemp);
        
        // 整理歷史數據
        GAME_STATE.history = fedRateData.map(d => {
            const cpiItem = cpiData.find(c => c.date === d.date);
            const unempItem = unempData.find(u => u.date === d.date);
            return {
                date: d.date,
                rate: d.value,
                cpi: cpiItem ? cpiItem.value : lastCPI,
                unemployment: unempItem ? unempItem.value : lastUnemp,
                gdpGrowth: 2.0, // 歷史 GDP 暫時設為中性
                sentiment: 0
            };
        });
        
        // 繪製圖表並更新 UI
        drawCombinedChart();
        updateUI();
        setNews('🚀 遊戲初始化完成！您現在是聯儲主席，請發布您的第一個決策。');

    } else {
        console.error("無法初始化遊戲，請檢查 API Key 或數據來源。");
        setNews('❌ 錯誤：無法初始化遊戲，請檢查控制台。', true);
    }
}

function handleNextTurn() {
    // 遊戲結束檢查
    if (GAME_STATE.credibility <= 0) {
        alert("💥 聯儲信譽度歸零！您因嚴重失職被國會解職。遊戲結束！");
        // 可以在這裡顯示一個專業結算畫面
        return; 
    }
    
    const rateInput = document.getElementById('rate-slider');
    const rateAdjustment = parseFloat(rateInput.value) / 100;
    
    // 執行核心模型計算
    const credibilityDelta = nextTurnModel(rateAdjustment);
    
    // 根據結果設定新聞頭條
    if (Math.abs(rateAdjustment) > 0.5) {
        setNews('🚨 突發新聞：聯儲突然大幅調整利率，市場恐慌！', true);
    } else if (rateAdjustment === 0) {
        setNews('🤔 聯儲維持利率不變。市場正在觀望... ');
    } else if (credibilityDelta > 0 && Math.abs(rateAdjustment) <= 0.25) {
        setNews('👍 聯儲政策穩健，經濟指標趨向目標。信譽度提升！');
    }
    
    // 更新 UI 
    updateUI();
    drawCombinedChart();
    
    // 重設滑桿
    rateInput.value = 0; 
}


// --- 綁定 UI 事件 ---

document.addEventListener('DOMContentLoaded', () => {
    const rateInput = document.getElementById('rate-slider');
    const commitBtn = document.getElementById('commit-decision');

    rateInput.addEventListener('input', () => {
        const rateAdjustment = parseFloat(rateInput.value) / 100; 
        updateUI(rateAdjustment); // 僅更新滑桿顯示
        
        const targetRate = GAME_STATE.currentRate + rateAdjustment;
        setNews(`💡 預計調整後利率為: ${targetRate.toFixed(2)}%`);
    });

    commitBtn.addEventListener('click', handleNextTurn);
    
    initializeGame();
});
