const apiKey = "sk-aarhekhyudfpfdqdnyphxdkxacfyaldbptiiduosufyfigdw";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
fetch("https://api.siliconflow.cn/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: "deepseek-chat",
    messages: [{ role: "user", content: "hello" }]
  })
}).then(r => r.json()).then(console.log).catch(console.error);
