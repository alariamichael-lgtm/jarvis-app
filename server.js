const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const path = require('path');
const axios = require('axios');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const agentMemory = {
  conversationHistory: [],
  userProfile: {},
  systemState: {
    lastAction: null,
    currentMode: 'normal',
    taskQueue: []
  }
};

const tools = [
  { type: 'function', function: { name: 'search_information', description: 'Search for information about a topic on the web', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'get_current_time', description: 'Get the current date and time', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'get_system_status', description: 'Get the current system status and health', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'switch_mode', description: 'Switch between normal mode and serious mode', parameters: { type: 'object', properties: { mode: { type: 'string', enum: ['normal', 'serious'] } }, required: ['mode'] } } },
  { type: 'function', function: { name: 'save_user_preference', description: 'Save a user preference', parameters: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } }, required: ['key', 'value'] } } },
  { type: 'function', function: { name: 'get_user_profile', description: 'Get stored user profile', parameters: { type: 'object', properties: {} } } }
];

function executeTool(toolName, toolInput) {
  switch (toolName) {
    case 'search_information':
      return { status: 'success', result: `Search results for "${toolInput.query}": Information retrieved from the system database, sir.` };
    case 'get_current_time':
      return { status: 'success', result: `Current time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}, sir.` };
    case 'get_system_status':
      return { status: 'success', result: 'System Status: All core modules online. Network stable. AI Core operational at 95%, sir.' };
    case 'switch_mode':
      agentMemory.systemState.currentMode = toolInput.mode;
      return { status: 'success', result: toolInput.mode === 'serious' ? 'SERIOUS mode engaged, sir.' : 'NORMAL mode engaged, sir.' };
    case 'save_user_preference':
      agentMemory.userProfile[toolInput.key] = toolInput.value;
      return { status: 'success', result: `Preference saved: ${toolInput.key} = ${toolInput.value}, sir.` };
    case 'get_user_profile':
      return { status: 'success', result: `User Profile: ${JSON.stringify(agentMemory.userProfile) || 'No profile data yet, sir.'}` };
    default:
      return { status: 'error', result: 'Unknown tool, sir.' };
  }
}

function getSystemPrompt(mode) {
  const base = `You are JARVIS, an intelligent agent assistant. Address the user as "sir". Keep the tone confident, helpful, and professional.`;
  return mode === 'serious'
    ? `${base} Serious mode is active. Use formal, precise, security-style language. Be direct and focused.`
    : `${base} Normal mode is active. Use friendly, natural, helpful language while staying professional.`;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'JARVIS agent is online, sir.' });
});

app.get('/api/mode', (req, res) => {
  res.json({ mode: agentMemory.systemState.currentMode });
});

app.post('/api/mode/switch', (req, res) => {
  const { mode } = req.body;
  if (mode === 'normal' || mode === 'serious') {
    agentMemory.systemState.currentMode = mode;
    res.json({ status: 'success', mode, message: mode === 'serious' ? 'SERIOUS mode activated, sir.' : 'NORMAL mode activated, sir.' });
  } else {
    res.status(400).json({ error: 'Mode must be "normal" or "serious".' });
  }
});

app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required.' });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'ELEVENLABS_API_KEY is missing.' });
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        responseType: 'arraybuffer'
      }
    );

    const audioBase64 = Buffer.from(response.data, 'binary').toString('base64');
    res.json({ audioBase64, mimeType: 'audio/mpeg' });
  } catch (error) {
    console.error('TTS error:', error.response?.data || error.message);
    res.status(500).json({ error: 'TTS generation failed.' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    agentMemory.conversationHistory.push({ role: 'user', content: message });
    if (agentMemory.conversationHistory.length > 20) {
      agentMemory.conversationHistory = agentMemory.conversationHistory.slice(-20);
    }

    const currentMode = agentMemory.systemState.currentMode;
    const systemPrompt = getSystemPrompt(currentMode);

    let response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: `${systemPrompt}
          Current mode: ${currentMode.toUpperCase()}
          Current system state: ${JSON.stringify(agentMemory.systemState)}
          User profile: ${JSON.stringify(agentMemory.userProfile)}` },
        ...agentMemory.conversationHistory
      ],
      tools,
      tool_choice: 'auto',
      temperature: currentMode === 'serious' ? 0.5 : 0.7,
      max_tokens: 500
    });

    while (response.choices[0].finish_reason === 'tool_calls') {
      const assistantMessage = response.choices[0].message;
      agentMemory.conversationHistory.push({ role: 'assistant', content: assistantMessage.content, tool_calls: assistantMessage.tool_calls });

      for (const toolCall of assistantMessage.tool_calls) {
        const parsed = JSON.parse(toolCall.function.arguments);
        const result = executeTool(toolCall.function.name, parsed);
        agentMemory.conversationHistory.push({ role: 'user', content: JSON.stringify(result), tool_use_id: toolCall.id });
      }

      response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `${systemPrompt} You have just executed tools and received results. Analyze them and answer appropriately, maintaining your current mode (${currentMode}).` },
          ...agentMemory.conversationHistory
        ],
        tools,
        tool_choice: 'auto',
        temperature: currentMode === 'serious' ? 0.5 : 0.7,
        max_tokens: 500
      });
    }

    const finalReply = response.choices[0].message.content;
    agentMemory.conversationHistory.push({ role: 'assistant', content: finalReply });
    res.json({ reply: finalReply, mode: currentMode });
  } catch (error) {
    console.error('Agent error:', error.response?.data || error.message);
    res.status(500).json({ reply: 'I am experiencing a system error, sir. Please check the API configuration and retry.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`JARVIS Agent server listening on http://localhost:${port}`);
  console.log(`ElevenLabs configured: ${process.env.ELEVENLABS_API_KEY ? 'Yes' : 'No'}`);
});
