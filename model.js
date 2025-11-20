// js/model.js - 核心經濟模擬模型 (模組化)

// --- 核心常數 ---
const CPI_TARGET = 2.0;
const UNEMP_TARGET = 4.0;
const NEUTRAL_RATE = 3.5; // 假設中性利率 (R-star)
const LAG_PERIOD = 4; // 政策對 CPI 的影響時滯為 4 個月

// --- 核心遊戲變數 ---
export let GAME_STATE = {
    currentDate: new Date('2024-01-01'),
    currentRate: 0, 
    credibility: 50,  
    cpi: 0,         
    unemployment: 4.0, 
    gdpGrowth: 2.0,    // 年化季度增長率 (簡化為月度變化)
    marketSentiment: 0, // -50 (極度恐懼) 到 50 (極度貪婪)
    ratePolicyLag: [], // 利率政策的佇列 (存儲最近 LAG_PERIOD 個月的政策)
    history: []
};

// --- 模型初始化函數 ---
export function initializeModel(initialRate, initialCPI, initialUnemp) {
    GAME_STATE.currentRate = initialRate;
    GAME_STATE.cpi = initialCPI;
    GAME_STATE.unemployment = initialUnemp;
    
    // 初始化政策時滯佇列
    for (let i = 0; i < LAG_PERIOD + 2; i++) {
         GAME_STATE.ratePolicyLag.push({ rate: initialRate, month: i });
    }
}

// --- 核心計算函數 ---

function calculateSentiment(rateChange) {
    // 政策衝擊: 政策調整幅度 * 信譽度 -> 情緒波動
    const policyImpact = rateChange * (GAME_STATE.credibility / 100) * 20; 
    // GDP 和 CPI 偏差也會影響情緒
    const gdpImpact = (GAME_STATE.gdpGrowth - 2.0) * 5;
    const cpiImpact = (GAME_STATE.cpi - CPI_TARGET) * -5; 
    
    GAME_STATE.marketSentiment = GAME_STATE.marketSentiment * 0.7 + policyImpact * 0.5 + gdpImpact * 0.3 + cpiImpact * 0.2 + (Math.random() - 0.5) * 5;
    GAME_STATE.marketSentiment = Math.max(-50, Math.min(50, GAME_STATE.marketSentiment));
}

function calculateCPI() {
    // 獲取 LAG_PERIOD (4 個月) 前的政策利率
    const laggedPolicy = GAME_STATE.ratePolicyLag[GAME_STATE.ratePolicyLag.length - LAG_PERIOD - 1]?.rate || GAME_STATE.currentRate;
    
    // 1. 政策影響 (時滯)：高利率抑制通膨
    const rateEffect = (laggedPolicy - CPI_TARGET) * 0.25; 
    // 2. 需求/情緒影響：情緒高漲/GDP 增長推高通膨 (菲利普斯曲線效應)
    const demandEffect = (GAME_STATE.marketSentiment * 0.015) + (GAME_STATE.gdpGrowth * 0.1); 
    // 3. 外部衝擊
    const externalShock = (Math.random() - 0.5) * 0.8;
    
    const deltaCPI = demandEffect + externalShock - rateEffect;
    
    GAME_STATE.cpi += deltaCPI;
    GAME_STATE.cpi = Math.max(0.1, GAME_STATE.cpi);
}

function calculateUnemployment() {
    // 奧肯法則 + 菲利普斯曲線簡化
    
    // 1. GDP 影響：GDP 增長越快，失業率越低
    const gdpEffect = (GAME_STATE.gdpGrowth - 2.0) * 0.25; 
    // 2. 利率影響：高利率抑制投資和招聘
    const rateEffect = (GAME_STATE.currentRate - NEUTRAL_RATE) * 0.15;
    
    const deltaUnemployment = rateEffect - gdpEffect + (Math.random() - 0.5) * 0.2;
    
    GAME_STATE.unemployment += deltaUnemployment;
    GAME_STATE.unemployment = Math.max(2.0, GAME_STATE.unemployment); 
}

function calculateGDP() {
    // 1. 利率影響：高利率抑制 GDP 
    const rateEffect = (GAME_STATE.currentRate - NEUTRAL_RATE) * 0.3;
    // 2. 情緒影響：情緒樂觀促進消費和投資
    const sentimentEffect = GAME_STATE.marketSentiment * 0.04;
    // 3. 通脹影響：高通脹抑制實際購買力
    const cpiEffect = (GAME_STATE.cpi - CPI_TARGET) * 0.2;
    
    const deltaGDP = sentimentEffect - rateEffect - cpiEffect + (Math.random() - 0.5) * 0.5;
    
    GAME_STATE.gdpGrowth += deltaGDP;
    GAME_STATE.gdpGrowth = Math.max(-5.0, GAME_STATE.gdpGrowth); 
}

export function updateCredibility(rateChange) {
    let credibilityChange = 0;
    const cpiDiff = GAME_STATE.cpi - CPI_TARGET;
    const unemploymentDiff = GAME_STATE.unemployment - UNEMP_TARGET; 

    // 1. 政策衝擊懲罰：突然大幅調整
    if (Math.abs(rateChange) > 0.5) {
        credibilityChange -= 10;
    }

    // 2. 雙重使命達成度
    const miseryIndex = Math.abs(cpiDiff) + Math.abs(unemploymentDiff);

    if (miseryIndex < 1.0) {
        credibilityChange += 5; // 雙重使命達標，重賞
    } else if (miseryIndex > 4.0) {
        credibilityChange -= 10; // 痛苦指數高，重罰
    } else {
        credibilityChange += 1;
    }
    
    GAME_STATE.credibility += credibilityChange;
    GAME_STATE.credibility = Math.max(0, Math.min(100, GAME_STATE.credibility));
    
    return credibilityChange; 
}


export function nextTurnModel(rateChange) {
    // 1. 儲存政策到時滯佇列 (確保政策在下回合開始前已儲存)
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

    // 4. 記錄歷史
    GAME_STATE.history.push({
        date: GAME_STATE.currentDate.toISOString().substring(0, 7),
        rate: GAME_STATE.currentRate,
        cpi: GAME_STATE.cpi,
        unemployment: GAME_STATE.unemployment,
        gdpGrowth: GAME_STATE.gdpGrowth,
        sentiment: GAME_STATE.marketSentiment
    });
    
    // 5. 進入下一回合
    GAME_STATE.currentDate.setMonth(GAME_STATE.currentDate.getMonth() + 1);

    return credibilityDelta;
}