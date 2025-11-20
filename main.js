// main.js - 遊戲主入口與流程控制 (V12.0 宏觀反應版)

import { GAME_STATE, initializeModel, nextTurnModel } from './model.js'; 
import { updateUI, drawCombinedChart, setNews } from './ui.js'; 

// --- 靜態初始值 ---
const START_RATE = 4.25;    // 聯邦基金利率
const START_CPI = 3.0;      // 通脹率
const START_UNEMP = 4.0;    // 失業率
const START_PORTFOLIO = 10000; // 初始資產

// --- 經濟指標新聞生成函數 (V12.0 新增) ---
function checkEconomicIndicatorsNews() {
    const CPI_TARGET = 2.0;
    const UNEMP_TARGET = 4.0;
    
    // 1. 檢查通縮/通膨失控
    if (GAME_STATE.cpi > CPI_TARGET + 1.5) {
        return { news: `🚨 核心通膨警報：CPI 飆升至 ${GAME_STATE.cpi.toFixed(2)}%，市場預期聯儲將強力升息！`, isWarning: true };
    }
    if (GAME_STATE.cpi < CPI_TARGET - 1.0) {
        return { news: `🥶 通縮威脅：CPI 跌至 ${GAME_STATE.cpi.toFixed(2)}% 以下，需求嚴重疲軟，經濟衰退風險增加。`, isWarning: true };
    }
    
    // 2. 檢查失業率崩潰/過熱
    if (GAME_STATE.unemployment > UNEMP_TARGET + 2.0) {
        return { news: `📉 就業市場崩潰：失業率飆升至 ${GAME_STATE.unemployment.toFixed(2)}%，民生壓力巨大。`, isWarning: true };
    }
    
    // 3. 檢查雙重使命達標 (CPI和失業率都接近目標)
    const cpiDiff = Math.abs(GAME_STATE.cpi - CPI_TARGET);
    const unempDiff = Math.abs(GAME_STATE.unemployment - UNEMP_TARGET);
    if (cpiDiff <= 0.5 && unempDiff <= 0.5) {
        return { news: `🎉 雙重使命達標：CPI 和失業率皆在理想區間，政策獲得高度肯定！`, isWarning: false };
    }

    // 4. 檢查通膨壓力 (中度偏差)
    if (GAME_STATE.cpi > CPI_TARGET + 0.5) {
        return { news: `⚠️ 通膨壓力持續：CPI 維持在 ${GAME_STATE.cpi.toFixed(2)}%，聯儲需採取行動。`, isWarning: true };
    }
    
    // 5. 預設中立狀態
    return null;
}
// --- 遊戲流程控制 ---

async function initializeGame() {
    
    // V10.0: 直接使用靜態值啟動遊戲
    
    initializeModel(START_RATE, START_CPI, START_UNEMP);

    // 設置初始資產
    // V11.0: 移除 playerPortfolio 相關邏輯
    
    // 確保歷史記錄至少有一個點
    GAME_STATE.history.push({
        date: "2024-01", 
        rate: START_RATE, 
        cpi: START_CPI, 
        unemployment: START_UNEMP, 
        gdpGrowth: 2.0, 
        sentiment: 0, 
        stockIndex: GAME_STATE.stockIndex, 
        // V11.0: 移除 portfolio
    });
    
    drawCombinedChart();
    updateUI(0);
    setNews('✅ 模擬模式啟動！您現在是聯儲主席，請發布您的第一個決策。');
}

function handleNextTurn() {
    if (GAME_STATE.credibility <= 0) {
        alert("💥 聯儲信譽度歸零！您因嚴重失職被國會解職。遊戲結束！");
        return; 
    }
    
    const rateInput = document.getElementById('rate-slider');
    const rateAdjustment = parseFloat(rateInput.value) / 100;
    
    const { credibilityDelta, eventTriggered } = nextTurnModel(rateAdjustment);
    
    // --- V12.0 新聞優先級處理 ---
    let newsHandled = false;
    
    // 1. 最高優先級：隨機事件新聞 (黑天鵝)
    if (eventTriggered) {
        const { news, isWarning } = GAME_STATE.currentShock;
        setNews(news, isWarning);
        newsHandled = true;
    }
    
    // 2. 次高優先級：經濟指標新聞 (基於數據的市場反應)
    if (!newsHandled) {
        const indicatorNews = checkEconomicIndicatorsNews();
        if (indicatorNews) {
            setNews(indicatorNews.news, indicatorNews.isWarning);
            newsHandled = true;
        }
    }

    // 3. 最低優先級：政策狀態新聞 (玩家操作導致的結果)
    if (!newsHandled) {
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
    
    initializeGame();
});
