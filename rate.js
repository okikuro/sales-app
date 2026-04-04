document.getElementById("tab-rate").innerHTML = `
<div class="card">
<h3>為替・利率</h3>

<div class="rate-box">
<div>

<h4>米ドル</h4>
<div>為替：<span id="usdRate">--</span></div>
<div>利率：<span id="usdInterest">--</span></div>
<div>15日前との差：--</div>

</div>

<div>
<h4>豪ドル</h4>
<div>為替：<span id="audRate">--</span></div>
<div>利率：<span id="audInterest">--</span></div>
<div>15日前との差：--</div>
</div>

</div>

<h3>履歴</h3>
<div id="rateHistory"></div>

</div>

<div class="card" style="margin-top:10px;">
<h3>第一フロンティア生命</h3>

<div class="rate-box">

<button onclick="window.open('https://www.d-frontier-life.co.jp/customer/rate/tsumitateriritsu_history.html?param=index_teiki_choice_23&product=&agency=')">
DFL レシーブ
</button>

<button onclick="window.open('https://www.d-frontier-life.co.jp/customer/rate/tsumitateriritsu_history.html?param=hendo_choice_19_05&product=&agency=')">
カレンシー
</button>

<button onclick="window.open('https://www.d-frontier-life.co.jp/customer/rate/tsumitateriritsu_history.html?param=hendo_shushin_choice_20_6&product=&agency=')">
プレゼント
</button>

</div>

</div>



`;

// 1. 画面の見た目（変更なし）
document.getElementById("tab-rate").innerHTML = `
<div class="card">
  <h3>為替・利率 (本日)</h3>
  <div class="rate-box">
    <div>
      <h4>米ドル</h4>
      <div>為替：<span id="usdRate">--</span></div>
      <div>利率：<span id="usdInterest">--</span></div>
      <div style="margin-top:5px; color:#666; font-size:0.85em;">
        15日前との差<br>
        為替：<span id="usdRateDiff">--</span><br>
        利率：<span id="usdInterestDiff">--</span>
      </div>
    </div>
    <div>
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
  <div class="rate-box">
    <button onclick="window.open('https://www.d-frontier-life.co.jp/customer/rate/tsumitateriritsu_history.html?param=index_teiki_choice_23&product=&agency=')">DFL レシーブ</button>
    <button onclick="window.open('https://www.d-frontier-life.co.jp/customer/rate/tsumitateriritsu_history.html?param=hendo_choice_19_05&product=&agency=')">カレンシー</button>
    <button onclick="window.open('https://www.d-frontier-life.co.jp/customer/rate/tsumitateriritsu_history.html?param=hendo_shushin_choice_20_6&product=&agency=')">プレゼント</button>
  </div>
</div>
`;

const FRED_API_KEY = "8655f5ac09be9421983b7cac553ee159";

async function updateAllData() {
  try {
    // 為替の最新値を取得
    const fxRes = await fetch("https://open.er-api.com/v6/latest/USD").then(r => r.json());
    const currentUsdRate = parseFloat(fxRes.rates.JPY.toFixed(2));
    const currentAudRate = parseFloat(((1 / fxRes.rates.AUD) * fxRes.rates.JPY).toFixed(2));

    // FREDから「直近20日分」の利率リストを取得
    const usdIntList = await fetchFredList("DGS10");
    const audIntList = await fetchFredList("IRLTLT01AUM156N");

    // 画面表示（最新の値をセット）
    document.getElementById("usdRate").textContent = currentUsdRate + " 円";
    document.getElementById("audRate").textContent = currentAudRate + " 円";
    document.getElementById("usdInterest").textContent = parseFloat(usdIntList[0].value).toFixed(2) + " %";
    document.getElementById("audInterest").textContent = parseFloat(audIntList[0].value).toFixed(2) + " %";

    // 履歴のまとめ取りと計算
    saveAndSyncHistory(currentUsdRate, currentAudRate, usdIntList, audIntList);

  } catch (e) {
    console.error("更新失敗", e);
  }
}

// FREDからリストで取得する関数（limit=20に変更）
async function fetchFredList(seriesId) {
  const targetUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=20`;
  const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(targetUrl);
  const response = await fetch(proxyUrl);
  const data = await response.json();
  return data.observations; // 配列で返す
}

function saveAndSyncHistory(uR, aR, uList, aList) {
  let history = JSON.parse(localStorage.getItem("finance_history") || "[]");
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. FREDのデータ（過去20日分）をループして、足りない日付を埋める
  uList.forEach((obs, index) => {
    const date = obs.date;
    const usdI = parseFloat(parseFloat(obs.value).toFixed(2));
    const audI = parseFloat(parseFloat(aList[index].value).toFixed(2));

    // その日のデータがまだ無ければ追加
    if (!history.find(item => item.date === date)) {
      history.push({
        date: date,
        usdR: (date === todayStr) ? uR : null, // 為替の過去分は取れないのでnull
        audR: (date === todayStr) ? aR : null,
        usdI: usdI,
        audI: audI
      });
    } else if (date === todayStr) {
      // 今日のデータは為替を最新に更新
      const idx = history.findIndex(item => item.date === date);
      history[idx].usdR = uR;
      history[idx].audR = aR;
      history[idx].usdI = usdI;
      history[idx].audI = audI;
    }
  });

  // 日付順に並び替え
  history.sort((a, b) => new Date(a.date) - new Date(b.date));

  // 2. 15日前との差を計算
  const todayData = history.find(item => item.date === todayStr);
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  const pastData = history.slice().reverse().find(item => item.date <= fifteenDaysAgo.toISOString().split('T')[0]);

  if (todayData && pastData) {
    // 為替の差（過去データに為替がある場合のみ）
    if (pastData.usdR) {
      displayDiff("usdRateDiff", todayData.usdR - pastData.usdR, "円");
      displayDiff("audRateDiff", todayData.audR - pastData.audR, "円");
    }
    // 利率の差（利率はまとめ取りしてるので計算できるはず）
    displayDiff("usdInterestDiff", todayData.usdI - pastData.usdI, "%");
    displayDiff("audInterestDiff", todayData.audI - pastData.audI, "%");
  }

  // 3. 履歴表示（1日・16日）
  const specialHistory = history.filter(item => {
    const d = new Date(item.date).getDate();
    return d === 1 || d === 16;
  }).reverse();

  document.getElementById("rateHistory").innerHTML = specialHistory.length > 0 
    ? specialHistory.map(item => `
      <div style="border-bottom:1px solid #ddd; margin-bottom:5px; padding-bottom:5px;">
        <strong>${item.date}</strong><br>
        米: ${item.usdR || '--'}円 / ${item.usdI}% | 豪: ${item.audR || '--'}円 / ${item.audI}%
      </div>`).join('')
    : "履歴収集中...";

  localStorage.setItem("finance_history", JSON.stringify(history.slice(-100)));
}

function displayDiff(id, diff, unit) {
  const el = document.getElementById(id);
  const sign = diff > 0 ? "+" : "";
  el.textContent = `${sign}${diff.toFixed(2)}${unit}`;
  el.style.color = diff > 0 ? "red" : (diff < 0 ? "blue" : "black");
}

updateAllData();

