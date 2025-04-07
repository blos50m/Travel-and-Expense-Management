const startVoiceBtn = document.getElementById("start-voice");
const voiceOutput = document.getElementById("voice-output");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    startVoiceBtn.addEventListener("click", () => {
        voiceOutput.innerText = "Listening...";
        recognition.start();
    });

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        voiceOutput.innerText = `You said: "${transcript}"`;
        sendToAssistant(transcript);
    };

    recognition.onerror = function (event) {
        voiceOutput.innerText = `Error: ${event.error}`;
    };
} else {
    startVoiceBtn.disabled = true;
    voiceOutput.innerText = "Voice recognition not supported in this browser.";
}

function sendToAssistant(userInput) {
    // Replace with your OpenAI API Key
    const apiKey = "YOUR_OPENAI_API_KEY";

    fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: userInput }],
        }),
    })
    .then(res => res.json())
    .then(data => {
        const response = data.choices[0].message.content;
        voiceOutput.innerText += `\nAssistant: ${response}`;
    })
    .catch(err => {
        voiceOutput.innerText += `\nError talking to AI: ${err}`;
    });
}
