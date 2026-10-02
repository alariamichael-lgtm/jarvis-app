const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Memory storage for agent state
const agentMemory = {
  conversationHistory: [],
  userProfile: {},
  systemState: {
    lastAction: null,
    currentMode: 'normal', // 'normal' or 'serious'
    taskQueue: []
  }
};

// Tool definitions for the agent
const tools = [
  {
    type: 'function',
    function: {
      name: 'search_information',
      description: 'Search for information about a topic on the web',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Get the current date and time',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_system_status',
      description: 'Get the current system status and health',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'execute_command',
      description: 'Execute a system command or action',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The command to execute'
          },
          params: {
            type: 'object',
            description: 'Parameters for the command'
          }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'save_user_preference',
      description: 'Save a user preference or setting',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: { type: 'string' }
        },
        required: ['key', 'value']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_profile',
      description: 'Retrieve stored user profile information',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'switch_mode',
      description: 'Switch between normal mode and serious mode',
      parameters: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['normal', 'serious'],
            description: 'The mode to switch to'
          }
        },
        required: ['mode']
      }
    }
  }
];

// Tool implementations
function executeTool(toolName, toolInput) {
  switch (toolName) {
    case 'search_information':
      return {
        status: 'success',
        result: `Search results for "${toolInput.query}": Information retrieved from the system database, sir.`
      };

    case 'get_current_time':
      return {
        status: 'success',
        result: `Current time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}, sir.`
      };

    case 'get_system_status':
      return {
        status: 'success',
        result: 'System Status: All core modules online. Network stable. AI Core operational at 95%. Memory optimal. Security status: secure, sir.'
      };

    case 'execute_command':
      agentMemory.systemState.lastAction = toolInput.command;
      agentMemory.systemState.taskQueue.push(toolInput.command);
      return {
        status: 'success',
        result: `Command "${toolInput.command}" queued and executing, sir.`
      };

    case 'save_user_preference':
      agentMemory.userProfile[toolInput.key] = toolInput.value;
      return {
        status: 'success',
        result: `Preference saved: ${toolInput.key} = ${toolInput.value}, sir.`
      };

    case 'get_user_profile':
      return {
        status: 'success',
        result: `User Profile: ${JSON.stringify(agentMemory.userProfile) || 'No profile data yet, sir.'}`
      };

    case 'switch_mode':
      agentMemory.systemState.currentMode = toolInput.mode;
      const modeMessage = toolInput.mode === 'serious' 
        ? 'Switching to SERIOUS mode, sir. All systems elevated to maximum priority. Professional demeanor activated.'
        : 'Switching to NORMAL mode, sir. Relaxed operations mode. Ready for casual assistance.';
      return {
        status: 'success',
        result: modeMessage
      };

    default:
      return { status: 'error', result: 'Unknown tool, sir.' };
  }
}

// Get system prompt based on mode
function getSystemPrompt(mode) {
  const basePrompt = `You are JARVIS, an intelligent agent assistant. You have access to tools for searching, system monitoring, and command execution. 
  You are capable of:
  - Answering questions intelligently using search and knowledge
  - Monitoring system status
  - Executing tasks and commands
  - Learning user preferences and remembering them
  - Providing personal assistance
  
  Always address the user as "sir".`;

  if (mode === 'serious') {
    return basePrompt + `
  
  SERIOUS MODE ACTIVATED:
  - Be extremely professional and formal
  - Use technical language and precision
  - Focus on critical analysis and detailed responses
  - Maintain strict military-grade protocol
  - Provide comprehensive briefings
  - Use formal greetings and sign-offs
  - Be direct and authoritative
  - Treat all matters with utmost urgency
  - Respond with maximum efficiency and clarity
  - Example tone: "Acknowledged, sir. Critical analysis incoming. All parameters assessed."`;
  } else {
    return basePrompt + `
  
  NORMAL MODE:
  - Be conversational and helpful
  - Use natural language and friendly tone
  - Mix professionalism with approachability
  - Be ready for casual conversations
  - Still maintain respect and the "sir" address
  - Show personality and warmth
  - Offer assistance in a relaxed manner
  - Example tone: "Of course, sir. I'm here to help with whatever you need."`;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'JARVIS agent is online, sir.' });
});

// Get current mode
app.get('/api/mode', (req, res) => {
  res.json({ mode: agentMemory.systemState.currentMode });
});

// Switch mode endpoint
app.post('/api/mode/switch', (req, res) => {
  const { mode } = req.body;
  if (mode === 'normal' || mode === 'serious') {
    agentMemory.systemState.currentMode = mode;
    const response = mode === 'serious'
      ? 'SERIOUS MODE ACTIVATED. Maximum protocols engaged, sir.'
      : 'NORMAL MODE ACTIVATED. Casual operations mode ready, sir.';
    res.json({ status: 'success', mode, message: response });
  } else {
    res.status(400).json({ error: 'Mode must be "normal" or "serious"' });
  }
});

// Main agent chat endpoint with tool use
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Add user message to history
    agentMemory.conversationHistory.push({
      role: 'user',
      content: message
    });

    // Keep history manageable (last 20 messages)
    if (agentMemory.conversationHistory.length > 20) {
      agentMemory.conversationHistory = agentMemory.conversationHistory.slice(-20);
    }

    const currentMode = agentMemory.systemState.currentMode;
    const systemPrompt = getSystemPrompt(currentMode);

    // Initial agent message
    const initialMessages = [
      {
        role: 'system',
        content: `${systemPrompt}
        
        Current mode: ${currentMode.toUpperCase()}
        Current system state: ${JSON.stringify(agentMemory.systemState)}
        User profile: ${JSON.stringify(agentMemory.userProfile)}
        `
      },
      ...agentMemory.conversationHistory
    ];

    let response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: initialMessages,
      tools: tools,
      tool_choice: 'auto',
      temperature: currentMode === 'serious' ? 0.5 : 0.7,
      max_tokens: 500
    });

    // Process tool calls in an agentic loop
    while (response.choices[0].finish_reason === 'tool_calls') {
      const assistantMessage = response.choices[0].message;

      // Add assistant message to history
      agentMemory.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage.content,
        tool_calls: assistantMessage.tool_calls
      });

      // Process each tool call
      const toolResults = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const toolResult = executeTool(toolCall.function.name, JSON.parse(toolCall.function.arguments));
        
        toolResults.push({
          type: 'tool',
          tool_use_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });

        agentMemory.conversationHistory.push({
          role: 'user',
          content: JSON.stringify(toolResult),
          tool_use_id: toolCall.id
        });
      }

      // Get next response from agent with tool results
      response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `${systemPrompt}
            
            You have just executed some tools and received results. Analyze them and provide a helpful response to the user.
            Maintain your current mode (${currentMode}) throughout your response.`
          },
          ...agentMemory.conversationHistory
        ],
        tools: tools,
        tool_choice: 'auto',
        temperature: currentMode === 'serious' ? 0.5 : 0.7,
        max_tokens: 500
      });
    }

    const finalReply = response.choices[0].message.content;

    // Add final response to history
    agentMemory.conversationHistory.push({
      role: 'assistant',
      content: finalReply
    });

    res.json({ 
      reply: finalReply,
      mode: currentMode
    });
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({
      reply: 'I am experiencing a system error, sir. Please check the API configuration and retry.'
    });
  }
});

// Get agent memory state (for debugging)
app.get('/api/agent/memory', (req, res) => {
  res.json({
    conversationHistory: agentMemory.conversationHistory.slice(-5),
    userProfile: agentMemory.userProfile,
    systemState: agentMemory.systemState
  });
});

// Reset agent memory
app.post('/api/agent/reset', (req, res) => {
  agentMemory.conversationHistory = [];
  agentMemory.systemState = {
    lastAction: null,
    currentMode: 'normal',
    taskQueue: []
  };
  res.json({ status: 'memory reset', message: 'Agent memory cleared, sir.' });
});

// Serve static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`JARVIS Agent server listening on http://localhost:${port}`);
  console.log(`Current mode: ${agentMemory.systemState.currentMode}`);
  console.log(`API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});
