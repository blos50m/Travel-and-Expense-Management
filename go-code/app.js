// app.js
async function generateItinerary() {
    const response = await fetch("https://api.travelpayouts.com/aviasales/v3/prices_for_dates", {
      method: "GET",
      headers: {
        "X-Access-Token": "YOUR_TRAVEL_API_KEY"
      }
    });
    const data = await response.json();
    document.getElementById("itinerary-output").textContent = JSON.stringify(data, null, 2);
  }
  
  async function scanReceipt() {
    const fileInput = document.getElementById("receipt-upload").files[0];
    if (!fileInput) return alert("Please upload a receipt image.");
    const formData = new FormData();
    formData.append("file", fileInput);
  
    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: "YOUR_OCR_API_KEY"
      },
      body: formData
    });
    const result = await response.json();
    const parsedText = result.ParsedResults?.[0]?.ParsedText || "No text found.";
    document.getElementById("expense-output").textContent = parsedText;
  }
  
  async function askAssistant() {
    const input = document.getElementById("assistant-input").value;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_OPENAI_API_KEY"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: input }]
      })
    });
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "No response.";
    document.getElementById("assistant-output").textContent = answer;
  }
  