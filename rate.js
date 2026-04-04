// 🌟 設定：FREDのAPIキー
const FRED_API_KEY = "8655f5ac09be9421983b7cac553ee159";

// 🌟 ページが読み込まれたら実行
window.addEventListener('load', () => {
  const tabRate = document.getElementById("tab-rate");
  if (!tabRate) return;
  
  // ① まず利率タブの「見た目」を作る
  tabRate.innerHTML = `
    <div class="card">
      <h3>為替・利率 (本日)</h3>
      <div class="rate-box">
        <div style="background:#f5f5f5; padding:10px; border-radius:8px; flex:1;">
          <h4>米ドル</h4>
          <div>為替：<span id="usdRate">--</span></div>
          <div>利率：<span id="usdInterest">--</span></div>
          <div style="margin-top:5px; color:#666; font-size:0.85em;">
            15日前との差<br>
            為替：<span id="usdRateDiff">--</span><br>
            利率：<span id="usdInterestDiff">--</span>
          </div>
        </div>
        <div style="background:#f5f5f5; padding:10px; border-radius:8px; flex:1; margin-left:10px;">
          <h4>豪ドル</h4>
          <div>為替：<span id="audRate">--</span></div>
          <div>利率：<span id="audInterest">--</span></div>
          <div style="margin-top:5px; color:#666; font-size:0.85em;">
            15日前との差<br>
            為替：<span id="audRateDiff">--</span><br>
            利率：<span id="audInterestDiff">--</span>
          </div>
        </div>
      </div>
      <h3 style="margin-top:20px;">履歴 (1日・16日)</h3>
      <div id="rateHistory" style="font-size:0.85em; background:#f9f9f9; padding:10px; border-radius:5px; max-height:200px; overflow-y:auto;">
        履歴収集中...
      </div>
    </div>

    <div class="card" style="margin-top:10px;">
      <h3>第一フロンティア生命</h3>
      <div style="display:flex; gap:5px; flex-wrap:wrap;">
        <button onclick="window.open('https://www.d-frontier-life.co.jp/customer/rate/tsumitateriritsu_history.html?param=index_teiki_choice_23&product=&agency=')" style="flex:1;">レシーブ</button>
        <button onclick="window.open('https://www.d-frontier-life.co.jp/customer/rate/tsumitateriritsu_history.html?param=hendo_choice_19_05&product=&agency=')" style="flex:1;">カレンシー</button>
        <button onclick="window.open('https://www.d-frontier-life.co.jp/customer/rate/hendo_shushin_choice_20_6&product=&agency=')" style="flex:1;">プレゼント</button>
      </div>
    </div>
    `;
  
  // ② データを取得しに行く
  updateAllData();
});

// 🌟 データ取得のメイン関数
async function updateAllData() {
  try {
    const fxRes = await fetch("https://open.er-api.com/v6/latest/USD").then(r => r.json());
    const currentUsdRate = parseFloat(fxRes.rates.JPY.toFixed(2));
    const currentAudRate = parseFloat(((1 / fxRes.rates.AUD) * fxRes.rates.JPY).toFixed(2));
    
    const usdIntList = await fetchFredList("DGS10");
    const audIntList = await fetchFredList("IRLTLT01AUM156N");
    
    document.getElementById("usdRate").textContent = currentUsdRate + " 円";
    document.getElementById("audRate").textContent = currentAudRate + " 円";
    document.getElementById("usdInterest").textContent = parseFloat(usdIntList[0].value).toFixed(2) + " %";
    document.getElementById("audInterest").textContent = parseFloat(audIntList[0].value).toFixed(2) + " %";
    
    saveAndSyncHistory(currentUsdRate, currentAudRate, usdIntList, audIntList);
  } catch (e) {
    console.error("更新失敗", e);
    const hist = document.getElementById("rateHistory");
    if (hist) hist.innerText = "データの取得に失敗しました。";
  }
}

async function fetchFredList(seriesId) {
  const targetUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=20`;
  const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(targetUrl);
  const response = await fetch(proxyUrl);
  const data = await response.json();
  return data.observations;
}

function saveAndSyncHistory(uR, aR, uList, aList) {
  let history = JSON.parse(localStorage.getItem("finance_history") || "[]");
  const todayStr = new Date().toISOString().split('T')[0];
  
  uList.forEach((obs, index) => {
    const date = obs.date;
    if (!history.find(item => item.date === date)) {
  history.push({
    date: date,
    usdR: uR,
    audR: aR,
    usdI: parseFloat(parseFloat(obs.value).toFixed(2)),
    audI: parseFloat(parseFloat(aList[index].value).toFixed(2))
  });
} else if (date === todayStr) {
  const idx = history.findIndex(item => item.date === date);
  history[idx].usdR = uR;
  history[idx].audR = aR;
  history[idx].usdI = parseFloat(parseFloat(obs.value).toFixed(2));
  history[idx].audI = parseFloat(parseFloat(aList[index].value).toFixed(2));
}
  });
  

  history.sort((a, b) => new Date(a.date) - new Date(b.date));
  const todayData = history.find(item => item.date === todayStr);
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  const pastData = history[history.length - 15];
  
if (todayData && pastData) {
  if (pastData.usdR !== null) {
    displayDiff("usdRateDiff", todayData.usdR - pastData.usdR, "円");
    displayDiff("audRateDiff", todayData.audR - pastData.audR, "円");
  }
  displayDiff("usdInterestDiff", todayData.usdI - pastData.usdI, "%");
  displayDiff("audInterestDiff", todayData.audI - pastData.audI, "%");
}
  
  const specialHistory = history.filter(item => {
    const d = new Date(item.date).getDate();
    return d === 1 || d === 16;
  }).reverse();
  
  document.getElementById("rateHistory").innerHTML = specialHistory.map(item => `
    <div style="border-bottom:1px solid #ddd; margin-bottom:5px; padding-bottom:5px;">
      <strong>${item.date}</strong><br>
      米: ${item.usdR || '--'}円 / ${item.usdI}% | 豪: ${item.audR || '--'}円 / ${item.audI}%
    </div>`).join('');
  
  localStorage.setItem("finance_history", JSON.stringify(history.slice(-100)));
}

function displayDiff(id, diff, unit) {
  const el = document.getElementById(id);
  if (!el) return;
  const sign = diff > 0 ? "+" : "";
  el.textContent = `${sign}${diff.toFixed(2)}${unit}`;
  el.style.color = diff > 0 ? "red" : (diff < 0 ? "blue" : "black");
}

