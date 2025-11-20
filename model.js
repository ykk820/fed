// model.js - 核心經濟模擬模型 (V9.0 券商邏輯版)

// --- 核心常數 ---
const CPI_TARGET = 2.0;
const UNEMP_TARGET = 4.0;
const NEUTRAL_RATE = 3.5; 
const LAG_PERIOD = 4; 
const SHOCK_PROBABILITY = 0.20; 
const INITIAL_NET_WORTH = 10000; // V9.0: 初始淨資產

// 重大事件清單
const SHOCK_EVENTS = [
    { name: 'Global Supply Chain Crisis', cpi: 0.8, gdp: -0.5, sentiment: -15, news: '💥 突發：亞洲主要工廠關閉，全球供應鏈崩潰！通膨壓力驟升！', isWarning: true },
    { name: 'Major Tech Breakthrough', cpi: -0.2, gdp: 0.8, sentiment: 20, news: '🚀 市場狂熱：突破性 AI 技術發布，生產力預期飆升！', isWarning: false },
    { name: 'Geopolitical Energy Crisis', cpi: 1.5, gdp: -0.3, sentiment: -25, news: '🔥 警告：中東衝突升級，原油價格飆破 $150！滯脹風險大增！', isWarning: true },
    { name: 'Massive Government Stimulus', cpi: 0.5, gdp: 0.5, sentiment: 10, news: '💰 國會通過 $2 兆基礎建設案，流動性將湧入市場。', isWarning: false },
    { name: 'Banking Sector Instability', cpi: -0.1, gdp: -0.8, sentiment: -30, news: '📉 金融危機恐懼：數家銀行倒閉，信貸緊縮開始！', isWarning: true },
    { name: 'Housing Market Bubble Burst', cpi: -0.3, gdp: -0.6, sentiment: -20, news: '🚨 房地產市場崩潰！房價暴跌，消費者信心嚴重受挫。', isWarning: true },
    { name: 'Strongest Job Report Ever', cpi: 0.1, gdp: 0.7, sentiment: 15, news: '📈 就業市場火熱，失業率創歷史新低！聯儲面臨升息壓力。', isWarning: false },
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
    playerPortfolio: INITIAL_NET_WORTH, // V9.0: 淨資產
    brokerageFlow: 0,                   // V9.0: 券商淨交易股數
    ratePolicyLag: [], 
    history: [],
    currentShock: {cpi: 0, gdp: 0, sentiment: 0, news: '', isWarning: false}, 
    previousStockIndex: 4000,
    previousPortfolio: INITIAL_NET_WORTH,
};

// --- 模型初始化函數 ---
export function initializeModel(initialRate, initialCPI, initialUnemp) {
    GAME_STATE.currentRate = initialRate;
    GAME_STATE.cpi = initialCPI;
    GAME_STATE.unemployment = initialUnemp;
    
    GAME_STATE.previousStockIndex = GAME_STATE.stockIndex;
    GAME_STATE.previousPortfolio = GAME_STATE.playerPortfolio;
    
    for (let i = 0; i < LAG_PERIOD + 2; i++) {
         GAME_STATE.ratePolicyLag.push({ rate: initialRate, month: i });
    }
}

// ... (calculateSentiment, calculateCPI, calculateUnemployment, calculateGDP 函數保持不變)

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

// ... (其他 calculateXXX 函數保持不變) ...

function calculateStockIndex(rateChange) {
    GAME_STATE.previousStockIndex = GAME_STATE.stockIndex; 
    
    const sentimentEffect = GAME_STATE.marketSentiment * 20; 
    const rateShock = rateChange * -300; 
    const macroEffect = (GAME_STATE.gdpGrowth / 2) * 50 + (4.0 - GAME_STATE.unemployment) * 50;
    
    const deltaIndex = (sentimentEffect + rateShock + macroEffect) / 10 + (Math.random() - 0.5) * 50;
    const indexMultiplier = 1 + (deltaIndex / GAME_STATE.stockIndex) * 0.5;
    
    GAME_STATE.stockIndex *= indexMultiplier;
    GAME_STATE.stockIndex = Math.max(1000, GAME_STATE.stockIndex); 
}

/**
 * V9.0 新增：券商動態模擬函數
 * 券商淨交易量 = (市場情緒趨勢) + 隨機波動
 */
function simulateBrokerageActivity() {
    const sentimentTrend = GAME_STATE.marketSentiment * 10; // 情緒高漲則淨買入，情緒低迷則淨賣出
    const randomNoise = (Math.random() - 0.5) * 200; // 隨機波動
    
    // 淨交易量：四捨五入到整數
    const netShares = Math.round(sentimentTrend + randomNoise);
    
    GAME_STATE.brokerageFlow = netShares;
}

/**
 * V9.0：更新玩家淨資產（資產完全隨指數被動增長）
 */
function updatePortfolioValue() {
    const indexMultiplier = GAME_STATE.stockIndex / GAME_STATE.previousStockIndex;
    GAME_STATE.playerPortfolio *= indexMultiplier;
}


export function updateCredibility(rateChange) {
    let credibilityChange = 0;
    const cpiDiff = GAME_STATE.cpi - CPI_TARGET;
    const unemploymentDiff = GAME_STATE.unemployment - UNEMP_TARGET; 

    if (Math.abs(rateChange) > 0.5) {
        credibilityChange -= 10;
    }

    const miseryIndex = Math.abs(cpiDiff) + Math.abs(unemploymentDiff);

    if (miseryIndex < 1.0) {
        credibilityChange += 5; 
    } else if (miseryIndex > 4.0) {
        credibilityChange -= 10; 
    } else {
        credibilityChange += 1;
    }
    
    GAME_STATE.credibility += credibilityChange;
    GAME_STATE.credibility = Math.max(0, Math.min(100, GAME_STATE.credibility));
    
    return credibilityChange; 
}


export function nextTurnModel(rateChange) {
    const eventTriggered = checkRandomEvent();
    
    GAME_STATE.previousPortfolio = GAME_STATE.playerPortfolio; // V9.0: 記錄前一期淨資產

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
    simulateBrokerageActivity(); // V9.0: 模擬券商交易量
    updatePortfolioValue();     // V9.0: 更新玩家資產

    // 4. 記錄歷史
    const currentPortfolio = GAME_STATE.playerPortfolio;
    GAME_STATE.history.push({
        date: GAME_STATE.currentDate.toISOString().substring(0, 7),
        rate: GAME_STATE.currentRate,
        cpi: GAME_STATE.cpi,
        unemployment: GAME_STATE.unemployment,
        gdpGrowth: GAME_STATE.gdpGrowth,
        sentiment: GAME_STATE.marketSentiment,
        stockIndex: GAME_STATE.stockIndex,
        portfolio: currentPortfolio, 
    });
    
    // 5. 進入下一回合
    GAME_STATE.currentDate.setMonth(GAME_STATE.currentDate.getMonth() + 1);

    return { credibilityDelta, eventTriggered }; 
}

// V9.0 移除 handleTransaction 函數
