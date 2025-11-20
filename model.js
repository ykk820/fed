// model.js - 核心經濟模擬模型 (V14.0 季度週期版)

// --- 核心常數 ---
const CPI_TARGET = 2.0;
const UNEMP_TARGET = 4.0;
const NEUTRAL_RATE = 3.5; 
const LAG_PERIOD = 4; // 現在 Lag Period 代表 4 個季度 (1 年)
const SHOCK_PROBABILITY = 0.35; // 季度事件發生機率提高
const TIME_MULTIPLIER = 2.0; // V14.0：將所有經濟變化放大 2.0 倍，使季度影響更劇烈

// 重大事件清單
const SHOCK_EVENTS = [
    { name: 'Global Supply Chain Crisis', cpi: 1.5, gdp: -1.0, sentiment: -30, news: '💥 突發：亞洲主要工廠關閉，全球供應鏈崩潰！通膨壓力驟升！', isWarning: true },
    { name: 'Major Tech Breakthrough', cpi: -0.4, gdp: 1.5, sentiment: 40, news: '🚀 市場狂熱：突破性 AI 技術發布，生產力預期飆升！', isWarning: false },
    { name: 'Geopolitical Energy Crisis', cpi: 2.5, gdp: -0.8, sentiment: -40, news: '🔥 警告：中東衝突升級，原油價格飆破 $150！滯脹風險大增！', isWarning: true },
    { name: 'Massive Government Stimulus', cpi: 1.0, gdp: 1.2, sentiment: 20, news: '💰 國會通過 $2 兆基礎建設案，流動性將湧入市場。', isWarning: false },
    { name: 'Banking Sector Instability', cpi: -0.2, gdp: -1.5, sentiment: -50, news: '📉 金融危機恐懼：數家銀行倒閉，信貸緊縮開始！', isWarning: true },
    { name: 'Housing Market Bubble Burst', cpi: -0.5, gdp: -1.0, sentiment: -35, news: '🚨 房地產市場崩潰！房價暴跌，消費者信心嚴重受挫。', isWarning: true },
    { name: 'Strongest Job Report Ever', cpi: 0.2, gdp: 1.4, sentiment: 30, news: '📈 就業市場火熱，失業率創歷史新低！聯儲面臨升息壓力。', isWarning: false },
];


// --- 核心遊戲變數 ---
export let GAME_STATE = {
    currentDate: new Date('2024-01-01'),
    currentRate: 0, 
    credibility: 50,  
    cpi: 0,         
    unemployment: 4.0, 
    gdpGrowth: 2.0,   
    marketSentiment: 0, 
    stockIndex: 4000, 
    brokerageFlow: 0,                   
    ratePolicyLag: [], 
    history: [],
    currentShock: {cpi: 0, gdp: 0, sentiment: 0, news: '', isWarning: false}, 
    previousStockIndex: 4000,
};

// --- 模型初始化函數 ---
export function initializeModel(initialRate, initialCPI, initialUnemp) {
    GAME_STATE.currentRate = initialRate;
    GAME_STATE.cpi = initialCPI;
    GAME_STATE.unemployment = initialUnemp;
    
    GAME_STATE.previousStockIndex = GAME_STATE.stockIndex;
    
    for (let i = 0; i < LAG_PERIOD + 2; i++) {
         GAME_STATE.ratePolicyLag.push({ rate: initialRate, month: i });
    }
}


function checkRandomEvent() {
    GAME_STATE.currentShock = {cpi: 0, gdp: 0, sentiment: 0, news: '', isWarning: false}; 
    
    if (Math.random() < SHOCK_PROBABILITY) {
        const event = SHOCK_EVENTS[Math.floor(Math.random() * SHOCK_EVENTS.length)];
        GAME_STATE.currentShock = { 
            cpi: event.cpi, 
            gdp: event.gdp, 
            sentiment: event.sentiment, 
            news: event.news,
            isWarning: event.isWarning 
        };
        return true;
    }
    return false;
}

function calculateSentiment(rateChange) {
    const policyImpact = rateChange * (GAME_STATE.credibility / 100) * 20; 
    const gdpImpact = (GAME_STATE.gdpGrowth - 2.0) * 5;
    const cpiImpact = (GAME_STATE.cpi - CPI_TARGET) * -5; 
    const shockImpact = GAME_STATE.currentShock.sentiment;
    
    GAME_STATE.marketSentiment = GAME_STATE.marketSentiment * 0.7 
        + (policyImpact * 0.5) 
        + (gdpImpact * 0.3) 
        + (cpiImpact * 0.2) 
        + shockImpact
        + (Math.random() - 0.5) * 5 * TIME_MULTIPLIER; // 放大隨機性
        
    GAME_STATE.marketSentiment = Math.max(-50, Math.min(50, GAME_STATE.marketSentiment));
}

function calculateCPI() {
    const laggedPolicy = GAME_STATE.ratePolicyLag[GAME_STATE.ratePolicyLag.length - LAG_PERIOD - 1]?.rate || GAME_STATE.currentRate;
    const rateEffect = (laggedPolicy - CPI_TARGET) * 0.25; 
    const demandEffect = (GAME_STATE.marketSentiment * 0.015) + (GAME_STATE.gdpGrowth * 0.1); 
    
    // 放大所有影響因子
    const deltaCPI = (demandEffect + GAME_STATE.currentShock.cpi - rateEffect) * TIME_MULTIPLIER;
    
    GAME_STATE.cpi += deltaCPI;
    GAME_STATE.cpi = Math.max(0.1, GAME_STATE.cpi);
}

function calculateUnemployment() {
    const gdpEffect = (GAME_STATE.gdpGrowth - 2.0) * 0.25; 
    const rateEffect = (GAME_STATE.currentRate - NEUTRAL_RATE) * 0.15;
    
    const deltaUnemployment = (rateEffect - gdpEffect + (Math.random() - 0.5) * 0.2) * TIME_MULTIPLIER;
    
    GAME_STATE.unemployment += deltaUnemployment;
    GAME_STATE.unemployment = Math.max(2.0, GAME_STATE.unemployment); 
}

function calculateGDP() {
    const rateEffect = (GAME_STATE.currentRate - NEUTRAL_RATE) * 0.3;
    const sentimentEffect = GAME_STATE.marketSentiment * 0.04;
    const cpiEffect = (GAME_STATE.cpi - CPI_TARGET) * 0.2;
    
    const deltaGDP = (sentimentEffect - rateEffect - cpiEffect + GAME_STATE.currentShock.gdp + (Math.random() - 0.5) * 0.5) * TIME_MULTIPLIER;
    
    GAME_STATE.gdpGrowth += deltaGDP;
    GAME_STATE.gdpGrowth = Math.max(-5.0, GAME_STATE.gdpGrowth); 
}


function calculateStockIndex(rateChange) {
    GAME_STATE.previousStockIndex = GAME_STATE.stockIndex; 
    
    const sentimentEffect = GAME_STATE.marketSentiment * 20; 
    const rateShock = rateChange * -300; 
    const macroEffect = (GAME_STATE.gdpGrowth / 2) * 50 + (4.0 - GAME_STATE.unemployment) * 50;
    
    // 放大季度變化
    const deltaIndex = (sentimentEffect + rateShock + macroEffect) / 10 + (Math.random() - 0.5) * 100 * TIME_MULTIPLIER;
    const indexMultiplier = 1 + (deltaIndex / GAME_STATE.stockIndex) * 0.5;
    
    GAME_STATE.stockIndex *= indexMultiplier;
    GAME_STATE.stockIndex = Math.max(1000, GAME_STATE.stockIndex); 
}

/**
 * 券商動態模擬函數
 */
function simulateBrokerageActivity() {
    const sentimentTrend = GAME_STATE.marketSentiment * 25; // 權重再次提高，以配合季度波動
    const randomNoise = (Math.random() - 0.5) * 350; 
    
    const netShares = Math.round(sentimentTrend + randomNoise);
    
    GAME_STATE.brokerageFlow = netShares;
}


export function updateCredibility(rateChange) {
    let credibilityChange = 0;
    const cpiDiff = GAME_STATE.cpi - CPI_TARGET;
    const unemploymentDiff = GAME_STATE.unemployment - UNEMP_TARGET; 

    // 政策衝擊懲罰比例不變
    if (Math.abs(rateChange) > 0.5) {
        credibilityChange -= 10;
    }

    const miseryIndex = Math.abs(cpiDiff) + Math.abs(unemploymentDiff);

    // 獎懲調整更快，因為數據變化更劇烈
    if (miseryIndex < 1.0) {
        credibilityChange += 8; 
    } else if (miseryIndex > 4.0) {
        credibilityChange -= 15; 
    } else {
        credibilityChange += 3;
    }
    
    GAME_STATE.credibility += credibilityChange;
    GAME_STATE.credibility = Math.max(0, Math.min(100, GAME_STATE.credibility));
    
    return credibilityChange; 
}


export function nextTurnModel(rateChange) {
    const eventTriggered = checkRandomEvent();
    
    // 1. 儲存政策到時滯佇列
    GAME_STATE.ratePolicyLag.push({ rate: GAME_STATE.currentRate + rateChange, month: GAME_STATE.currentDate.getMonth() });
    
    // 2. 執行決策
    GAME_STATE.currentRate += rateChange; 
    GAME_STATE.currentRate = Math.max(0, GAME_STATE.currentRate); 

    // 3. 模擬經濟結果
    const credibilityDelta = updateCredibility(rateChange);
    calculateSentiment(rateChange);
    calculateGDP();
    calculateUnemployment();
    calculateCPI(); 
    calculateStockIndex(rateChange);
    simulateBrokerageActivity(); 

    // 4. 記錄歷史
    GAME_STATE.history.push({
        date: GAME_STATE.currentDate.toISOString().substring(0, 7),
        rate: GAME_STATE.currentRate,
        cpi: GAME_STATE.cpi,
        unemployment: GAME_STATE.unemployment,
        gdpGrowth: GAME_STATE.gdpGrowth,
        sentiment: GAME_STATE.marketSentiment,
        stockIndex: GAME_STATE.stockIndex,
    });
    
    // V14.0: 進入下一回合 (前進 3 個月)
    GAME_STATE.currentDate.setMonth(GAME_STATE.currentDate.getMonth() + 3);

    return { credibilityDelta, eventTriggered }; 
}
