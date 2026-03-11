'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Copy, Check, Plus, Trash2, Upload, FileAudio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

interface Tool {
  name: string;
  enabled: boolean;
}

const AVAILABLE_TOOLS: Tool[] = [
  { name: 'web_search', enabled: false },
  { name: 'code_interpreter', enabled: false },
  { name: 'weather', enabled: false },
  { name: 'stock_price', enabled: false },
  { name: 'currency_converter', enabled: false },
  { name: 'academic_search', enabled: false },
  { name: 'youtube_search', enabled: false },
  { name: 'flight_tracker', enabled: false },
  { name: 'text_translate', enabled: false },
  { name: 'mermaid_diagram', enabled: false },
];

export default function ApiPlayground() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('llama-4-maverick-17b-128e-instruct');
  const [messages, setMessages] = useState<Message[]>([{ role: 'user', content: 'Hello! What can you do?' }]);
  const [streaming, setStreaming] = useState(false);
  const [autoExecuteTools, setAutoExecuteTools] = useState(false);
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('');
  const [tools, setTools] = useState<Tool[]>(AVAILABLE_TOOLS);
  const [toolChoice, setToolChoice] = useState('auto');
  const [autoLoadTools, setAutoLoadTools] = useState(false);
  const [response, setResponse] = useState('');
  const [toolCallResult, setToolCallResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('response');
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const addMessage = () => {
    setMessages([...messages, { role: 'user', content: '' }]);
  };

  const updateMessage = (index: number, field: 'role' | 'content', value: string) => {
    const newMessages = [...messages];
    newMessages[index] = { ...newMessages[index], [field]: value };
    setMessages(newMessages);
  };

  const removeMessage = (index: number) => {
    setMessages(messages.filter((_, i) => i !== index));
  };

  const toggleTool = (toolName: string) => {
    setTools(tools.map((tool) => (tool.name === toolName ? { ...tool, enabled: !tool.enabled } : tool)));
  };

  const generateRequest = () => {
    const enabledTools = tools.filter((t) => t.enabled);
    const request: any = {
      model,
      messages,
      stream: streaming,
    };

    if (temperature) request.temperature = parseFloat(temperature);
    if (maxTokens) request.max_tokens = parseInt(maxTokens);

    if (autoLoadTools) {
      request.tools = 'auto';
      request.tool_choice = toolChoice === 'none' ? 'none' : 'auto';
    } else if (enabledTools.length > 0 && toolChoice !== 'none') {
      request.tools = enabledTools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: `Use the ${tool.name} tool`,
          parameters: { type: 'object', properties: {}, required: [] },
        },
      }));

      if (toolChoice === 'auto') {
        request.tool_choice = 'auto';
      } else if (toolChoice.startsWith('function:')) {
        const functionName = toolChoice.substring(9);
        request.tool_choice = {
          type: 'function',
          function: { name: functionName },
        };
      }
    }

    return request;
  };

  const handleWhisperUpload = async () => {
    if (!audioFile) {
      alert('Please select an audio file');
      return;
    }

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', model);

    const response = await fetch('/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Transcription failed');
    }

    return response.json();
  };

  const sendRequest = async () => {
    if (!apiKey) {
      alert('Please enter your API key');
      return;
    }

    const isWhisperModel = model === 'whisper-large-v3';
    if (isWhisperModel && !audioFile) {
      alert('Please select an audio file');
      return;
    }

    setLoading(true);
    setResponse('');
    setToolCallResult('');
    setActiveTab('response');

    if (isWhisperModel && audioFile) {
      try {
        const result = await handleWhisperUpload();
        setResponse(result.text || 'No transcription returned');
        setLoading(false);
        return;
      } catch (error) {
        console.error('[Playground] Transcription error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setResponse(`❌ Transcription Error: ${errorMessage}`);
        setLoading(false);
        return;
      }
    }

    try {
      const requestBody = generateRequest();

      if (streaming) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000);

        try {
          const response = await fetch('/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errorMessage: string;

            if (contentType && contentType.includes('application/json')) {
              try {
                const errorData = await response.json();
                errorMessage = errorData.error?.message || JSON.stringify(errorData);
              } catch {
                errorMessage = await response.text();
              }
            } else if (response.status === 503) {
              errorMessage =
                'Request timed out. The operation took too long to complete. Try again with a simpler request or fewer tools.';
            } else if (response.status === 401) {
              errorMessage = 'Invalid API key. Please check your API key format (should start with sk-scx-).';
            } else if (response.status === 429) {
              errorMessage = 'Rate limit exceeded. Please wait before making another request.';
            } else {
              errorMessage = `Server returned HTML instead of JSON. Status: ${response.status}`;
            }

            const errorDisplay =
              `❌ Streaming Error ${response.status}: ${errorMessage}\n\n` +
              `🔍 Troubleshooting:\n` +
              `• For timeouts: Try simpler requests or disable some tools\n` +
              `• For auth errors: Verify your API key in the API Keys section\n` +
              `• For rate limits: Wait 60 seconds and try again\n\n` +
              `📝 Request details:\n` +
              `• Model: ${model}\n` +
              `• Tools: ${
                autoLoadTools
                  ? 'Auto (all tools)'
                  : tools
                      .filter((t) => t.enabled)
                      .map((t) => t.name)
                      .join(', ') || 'None'
              }`;

            setResponse(errorDisplay);
            setActiveTab('response');
            return;
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          while (reader) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    setResponse((prev) => prev + content);
                  }
                } catch {
                  // ignore JSON errors
                }
              }
            }
          }
        } catch (timeoutError) {
          clearTimeout(timeoutId);
          throw timeoutError;
        }
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000);

        try {
          const response = await fetch('/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errorMessage = 'Failed to parse error response';

            if (contentType && contentType.includes('application/json')) {
              try {
                const errorData = await response.json();
                errorMessage = errorData.error?.message || JSON.stringify(errorData, null, 2);
              } catch {
                errorMessage = 'Failed to parse error response';
              }
            } else if (response.status === 503) {
              errorMessage =
                'Request timed out. The operation took too long to complete. Try again with a simpler request.';
            } else {
              errorMessage = `Server returned HTML instead of JSON. Status: ${response.status}`;
            }

            setResponse(`Error ${response.status}: ${errorMessage}`);
            return;
          }

          const data = await response.json();

          if (data.tool_execution_results && data.tool_execution_results.length > 0) {
            setActiveTab('toolResult');
            setResponse(JSON.stringify(data, null, 2));

            let toolResultLog = '🔧 Tool Execution Results:\n\n';

            for (const toolResult of data.tool_execution_results) {
              toolResultLog += `📋 Tool: ${toolResult.toolName}\n`;
              toolResultLog += `📥 Arguments: ${JSON.stringify(toolResult.args, null, 2)}\n`;
              toolResultLog += `📤 Result:\n${JSON.stringify(toolResult.result, null, 2)}\n`;
              toolResultLog += `${'─'.repeat(60)}\n\n`;
            }

            if (data.choices?.[0]?.message?.content) {
              toolResultLog += '🤖 Final AI Response (incorporating tool results):\n\n';
              toolResultLog += data.choices[0].message.content;
            }

            setToolCallResult(toolResultLog);
          } else if (data.choices?.[0]?.message?.tool_calls) {
            setActiveTab('toolResult');
            setResponse(JSON.stringify(data, null, 2));

            let toolResultLog = 'Tool Calls Requested:\n\n';
            const toolCalls = data.choices[0].message.tool_calls;

            for (const toolCall of toolCalls) {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                toolResultLog += `🔧 ${toolCall.function.name}\n`;
                toolResultLog += `📥 Arguments: ${JSON.stringify(args, null, 2)}\n`;
                toolResultLog += `🆔 Call ID: ${toolCall.id}\n\n`;
              } catch {
                toolResultLog += `🔧 ${toolCall.function.name}\n`;
                toolResultLog += `📥 Raw Arguments: ${toolCall.function.arguments}\n`;
                toolResultLog += `🆔 Call ID: ${toolCall.id}\n\n`;
              }
            }

            toolResultLog += '--- Next Steps ---\n';
            toolResultLog += 'These tool calls are ready to be executed by your application.\n';
            toolResultLog += 'Send the tool results back in a follow-up request to get the final response.';

            setToolCallResult(toolResultLog);
          } else {
            setResponse(JSON.stringify(data, null, 2));
            if (data.choices?.[0]?.message?.content) {
              setToolCallResult(
                "No tools were called for this request.\n\nThis was a regular chat completion using the model's knowledge only.",
              );
            }
          }
        } catch (timeoutError) {
          clearTimeout(timeoutId);
          throw timeoutError;
        }
      }
    } catch (error) {
      console.error('[Playground] Request error:', error);

      let errorMessage = 'An error occurred while making the request.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      const errorDisplay =
        `❌ Error: ${errorMessage}\n\n` +
        `🔍 Troubleshooting:\n` +
        `• Check your API key is valid and has the correct format (sk-scx-...)\n` +
        `• Ensure you have Pro subscription access for the developer API\n` +
        `• Verify your request doesn't exceed rate limits (60 RPM, 100K tokens/day)\n` +
        `• Check if the selected model supports the requested tools\n\n` +
        `📝 Request details:\n` +
        `• Model: ${model}\n` +
        `• Tools enabled: ${
          autoLoadTools
            ? 'Auto (all tools)'
            : tools
                .filter((t) => t.enabled)
                .map((t) => t.name)
                .join(', ') || 'None'
        }\n` +
        `• Streaming: ${streaming ? 'Yes' : 'No'}`;

      setResponse(errorDisplay);
      setToolCallResult('Request failed - see Response tab for details');
      setActiveTab('response');
    } finally {
      setLoading(false);
    }
  };

  const getRequestCode = () => {
    const request = generateRequest();
    return JSON.stringify(request, null, 2);
  };

  const getCurlCommand = () => {
    const request = generateRequest();
    return `curl https://api.scx.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}" \\
  -d '${JSON.stringify(request, null, 2).replace(/'/g, "\\'")}'`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Playground</CardTitle>
        <CardDescription>Test the API directly in your browser</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="api-key">API Key</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="sk-scx-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Your API key is never stored and only used for this session
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek-r1-0528">deepseek-r1-0528</SelectItem>
                <SelectItem value="deepseek-v3-0324">deepseek-v3-0324</SelectItem>
                <SelectItem value="deepseek-v3.1">deepseek-v3.1</SelectItem>
                <SelectItem value="deepseek-r1-distill-llama-70b">deepseek-r1-distill-llama-70b</SelectItem>
                <SelectItem value="meta-llama-3.3-70b-instruct">meta-llama-3.3-70b-instruct</SelectItem>
                <SelectItem value="meta-llama-3.1-8b-instruct">meta-llama-3.1-8b-instruct</SelectItem>
                <SelectItem value="llama-4-maverick-17b-128e-instruct">llama-4-maverick-17b-128e-instruct</SelectItem>
                <SelectItem value="gpt-oss-120b">gpt-oss-120b</SelectItem>
                <SelectItem value="whisper-large-v3">whisper-large-v3</SelectItem>
                <SelectItem value="qwen3-32b">qwen3-32b</SelectItem>
                <SelectItem value="e5-mistral-7b-instruct">e5-mistral-7b-instruct</SelectItem>
                <SelectItem value="magpie-small-experimental">magpie-small-experimental</SelectItem>
                <SelectItem value="llama-3.3">llama-3.3 (Legacy)</SelectItem>
                <SelectItem value="llama-4">llama-4 (Legacy)</SelectItem>
                <SelectItem value="deepseek-v3">deepseek-v3 (Legacy)</SelectItem>
                <SelectItem value="deepseek-r1">deepseek-r1 (Legacy)</SelectItem>
                <SelectItem value="gpt-oss">gpt-oss (Legacy)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch id="streaming" checked={streaming} onCheckedChange={setStreaming} />
              <Label htmlFor="streaming">Streaming</Label>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <Switch id="autoExecuteTools" checked={autoExecuteTools} onCheckedChange={setAutoExecuteTools} />
                <Label htmlFor="autoExecuteTools">Show Tool Execution Flow</Label>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-8">
                {autoExecuteTools
                  ? 'Shows complete tool execution flow with results (tools execute server-side)'
                  : 'Shows only the initial tool call request without execution details'}
              </p>
            </div>
          </div>
        </div>

        {model === 'whisper-large-v3' && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileAudio className="h-4 w-4" />
                Audio File Upload
              </CardTitle>
              <CardDescription className="text-xs">
                Upload an audio file (MP3 or M4A, max 25MB) for transcription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="audio-file" className="cursor-pointer">
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      {audioFile ? (
                        <div className="space-y-2">
                          <FileAudio className="h-8 w-8 mx-auto text-blue-600" />
                          <p className="text-sm font-medium text-blue-900">{audioFile.name}</p>
                          <p className="text-xs text-blue-600">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              setAudioFile(null);
                            }}
                          >
                            Remove File
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-blue-400" />
                          <p className="text-sm text-blue-700">Click to upload audio file</p>
                          <p className="text-xs text-blue-600">MP3 or M4A, up to 25MB</p>
                        </div>
                      )}
                    </div>
                    <Input
                      id="audio-file"
                      type="file"
                      accept=".mp3,.m4a,audio/mpeg,audio/mp4"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 25 * 1024 * 1024) {
                            alert('File size must be less than 25MB');
                            return;
                          }
                          setAudioFile(file);
                        }
                      }}
                    />
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {model !== 'whisper-large-v3' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="temperature">Temperature ({temperature})</Label>
              <Input
                id="temperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="max-tokens">Max Tokens (optional)</Label>
              <Input
                id="max-tokens"
                type="number"
                placeholder="Leave empty for default"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
              />
            </div>
          </div>
        )}

        {model !== 'whisper-large-v3' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Messages</Label>
              <Button size="sm" variant="outline" onClick={addMessage}>
                <Plus className="h-4 w-4 mr-1" /> Add Message
              </Button>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex gap-2"
                  >
                    <Select value={message.role} onValueChange={(value) => updateMessage(index, 'role', value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="assistant">Assistant</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={message.content}
                      onChange={(e) => updateMessage(index, 'content', e.target.value)}
                      placeholder="Enter message content..."
                      className="flex-1 min-h-[60px]"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeMessage(index)}
                      disabled={messages.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {model !== 'whisper-large-v3' && (
          <div className="space-y-3">
            <div>
              <Label>Tools (Optional)</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {autoLoadTools
                  ? 'Auto mode enabled - API will automatically load all 30+ available tools'
                  : tools.some((t) => t.enabled)
                    ? toolChoice === 'none'
                      ? 'Tools enabled but forced off - using model knowledge only'
                      : 'Tools enabled - model can call selected tools and execute them server-side'
                    : 'No tools enabled - using model knowledge only'}
              </p>
            </div>

            <div className="border rounded-lg p-3 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <Switch id="autoLoadTools" checked={autoLoadTools} onCheckedChange={setAutoLoadTools} />
                    <Label htmlFor="autoLoadTools" className="font-medium">
                      Auto-load all tools (tools="auto")
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enable this to test the API feature that automatically loads all 30+ available tools
                  </p>
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-2 md:grid-cols-3 gap-2 ${autoLoadTools ? 'opacity-50' : ''}`}>
              {tools.map((tool) => (
                <label
                  key={tool.name}
                  className={`flex items-center space-x-2 ${autoLoadTools ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    checked={tool.enabled}
                    onChange={() => !autoLoadTools && toggleTool(tool.name)}
                    disabled={autoLoadTools}
                    className="rounded"
                  />
                  <span className="text-sm">{tool.name}</span>
                </label>
              ))}
            </div>

            {(tools.some((t) => t.enabled) || autoLoadTools) && (
              <div>
                <Label htmlFor="tool-choice">Tool Choice Strategy</Label>
                <Select value={toolChoice} onValueChange={setToolChoice}>
                  <SelectTrigger id="tool-choice" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      <span className="font-medium">Auto</span> - Model decides
                    </SelectItem>
                    <SelectItem value="none">
                      <span className="font-medium">None</span> - Force knowledge only
                    </SelectItem>
                    {tools
                      .filter((t) => t.enabled)
                      .map((tool) => (
                        <SelectItem key={tool.name} value={`function:${tool.name}`}>
                          <span className="font-medium">Force {tool.name}</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <Button onClick={sendRequest} disabled={loading} className="w-full">
          {loading ? (
            'Sending...'
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" /> Send Request
            </>
          )}
        </Button>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="response">Response</TabsTrigger>
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="curl">cURL</TabsTrigger>
            <TabsTrigger value="toolResult">Tool Result</TabsTrigger>
          </TabsList>

          <TabsContent value="response" className="mt-4">
            <div className="relative">
              <div className="absolute top-2 right-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(response, 'response')}
                  disabled={!response}
                >
                  {copiedText === 'response' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="bg-muted rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-auto">
                <pre className="text-sm whitespace-pre-wrap">{response || 'Response will appear here...'}</pre>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="request" className="mt-4">
            <div className="relative">
              <div className="absolute top-2 right-2">
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(getRequestCode(), 'request')}>
                  {copiedText === 'request' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="bg-muted rounded-lg p-4 max-h-[400px] overflow-auto">
                <pre className="text-sm">{getRequestCode()}</pre>
                {autoLoadTools && (
                  <div className="mt-3 p-3 bg-primary/10 rounded-md">
                    <p className="text-xs font-medium text-primary">
                      Note: Using tools="auto" - the API will automatically load all 30+ available tools and execute
                      them server-side when called
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="curl" className="mt-4">
            <div className="relative">
              <div className="absolute top-2 right-2">
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(getCurlCommand(), 'curl')}>
                  {copiedText === 'curl' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="bg-muted rounded-lg p-4 max-h-[400px] overflow-auto">
                <pre className="text-sm">{getCurlCommand()}</pre>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="toolResult" className="mt-4">
            <div className="relative">
              <div className="absolute top-2 right-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(toolCallResult, 'toolResult')}
                  disabled={!toolCallResult}
                >
                  {copiedText === 'toolResult' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="bg-muted rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-auto">
                <pre className="text-sm whitespace-pre-wrap">
                  {toolCallResult || 'Tool execution results will appear here when auto-execute is enabled...'}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
