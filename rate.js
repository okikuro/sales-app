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
<div>利率：-- %</div>
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

async function getRate() {
  try {
    
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    
    const usdRate = data.rates.JPY.toFixed(2);
    
    const res2 = await fetch("https://open.er-api.com/v6/latest/AUD");
    const data2 = await res2.json();
    
    const audRate = data2.rates.JPY.toFixed(2);
    
    document.getElementById("usdRate").textContent = usdRate + " 円";
    document.getElementById("audRate").textContent = audRate + " 円";
    
    saveRate();
    
  } catch (e) {
    console.log("取得失敗", e);
  }
}

async function getUSInterest() {
  try {
    
    const res = await fetch(
      "https://api.allorigins.win/raw?url=https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10"
    );
    
    const text = await res.text();
    
    const rows = text.split("\n");
    
    let latest;
    
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i].split(",");
      if (row[1] && row[1] !== ".") {
        latest = row[1];
        break;
      }
    }
    
    document.getElementById("usdInterest").textContent =
      parseFloat(latest).toFixed(2) + " %";
    
  } catch (e) {
    console.log("米金利取得失敗", e);
  }
}


setTimeout(getRate, 500);
setTimeout(getUSInterest, 1200);


function saveRate() {
  
  const today = new Date().toISOString().slice(0, 10);
  
  const usd = document.getElementById("usdRate").textContent;
  const aud = document.getElementById("audRate").textContent;
  
  const data = {
    date: today,
    usd: usd,
    aud: aud
  };
  
  let history = JSON.parse(localStorage.getItem("rateHistory") || "[]");
  
  history.push(data);
  
  localStorage.setItem("rateHistory", JSON.stringify(history));
  
  console.log("保存完了", data);
  
}

