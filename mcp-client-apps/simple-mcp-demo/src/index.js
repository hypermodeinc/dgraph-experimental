// Import the ModelContextProtocol SDK
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// Get DOM elements
const serverTypeSelect = document.getElementById('serverType');
const serverUrlInput = document.getElementById('serverUrl');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const toolSelect = document.getElementById('toolSelect');
const toolParams = document.getElementById('toolParams');
const paramsContainer = document.getElementById('paramsContainer');
const callToolBtn = document.getElementById('callToolBtn');
const logElement = document.getElementById('log');
const resultsElement = document.getElementById('results');
const parsedJsonElement = document.getElementById('parsedJson');

// Global client object, transport and tools info
let mcpClient = null;
let transport = null;
let toolsInfo = [];

// Server presets
const SERVER_PRESETS = {
    kgms: 'http://localhost:9191',
    dgraph: 'http://localhost:8080/mcp'
};

// Log messages to the UI
function log(message) {
    const entry = document.createElement('div');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logElement.appendChild(entry);
    logElement.scrollTop = logElement.scrollHeight;
    console.log(message);
}

// Debug logs to store information
let debugLogs = [];

// Debug log function to both log to console and store for UI display
function debugLog(message, data) {
    const logEntry = {
        timestamp: new Date().toLocaleTimeString(),
        message,
        data: data !== undefined ? (typeof data === 'string' ? data : JSON.stringify(data, null, 2)) : null
    };
    
    debugLogs.push(logEntry);
    console.log(message, data);
    
    // Update debug display if it exists
    updateDebugDisplay();
}

// Show results in the results panel
function showResults(data, includeDebug = false) {
    let content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    
    // Optionally include debug logs
    if (includeDebug && debugLogs.length > 0) {
        content += '\n\n---- DEBUG LOGS ----\n';
        debugLogs.forEach(log => {
            content += `\n[${log.timestamp}] ${log.message}`;
            if (log.data) {
                content += `\n${log.data}`;
            }
            content += '\n';
        });
    }
    
    resultsElement.textContent = content;
    
    // Try to parse JSON from the text field if present
    parseJsonFromResponse(data);
}

// Parse and pretty print JSON from the response text field
function parseJsonFromResponse(data) {
    try {
        // If it's a string, try to parse it as JSON first
        let jsonData = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Check if we have the expected structure with content array
        if (jsonData && jsonData.content && Array.isArray(jsonData.content)) {
            // Look for text entries
            const textEntries = jsonData.content.filter(item => item.type === 'text' && item.text);
            
            if (textEntries.length > 0) {
                let parsedResults = [];
                
                // Process each text entry
                textEntries.forEach(textEntry => {
                    try {
                        // Parse the escaped JSON string in the text field
                        const innerJson = JSON.parse(textEntry.text);
                        parsedResults.push(innerJson);
                    } catch (innerError) {
                        // If we can't parse it as JSON, just add it as is
                        parsedResults.push(textEntry.text);
                    }
                });
                
                // Display the parsed results
                if (parsedResults.length === 1) {
                    // If only one result, just show it directly
                    parsedJsonElement.textContent = JSON.stringify(parsedResults[0], null, 2);
                } else {
                    // If multiple results, show them all in an array
                    parsedJsonElement.textContent = JSON.stringify(parsedResults, null, 2);
                }
                
                return; // We've processed the JSON successfully
            }
        }
        
        // If we didn't find any text entries or couldn't process them, just show "No parsed results"
        parsedJsonElement.textContent = 'No JSON text field found in response';
        
    } catch (error) {
        parsedJsonElement.textContent = `Error parsing JSON: ${error.message}`;
    }
}

// Update the debug display
function updateDebugDisplay() {
    const debugContainer = document.getElementById('debugInfo');
    if (!debugContainer) return;
    
    // Clear existing content
    debugContainer.innerHTML = '';
    
    // Add each debug log
    debugLogs.forEach(log => {
        const logEntry = document.createElement('div');
        logEntry.className = 'debug-entry';
        
        const header = document.createElement('div');
        header.className = 'debug-header';
        header.textContent = `[${log.timestamp}] ${log.message}`;
        logEntry.appendChild(header);
        
        if (log.data) {
            const data = document.createElement('pre');
            data.className = 'debug-data';
            data.textContent = log.data;
            logEntry.appendChild(data);
        }
        
        debugContainer.appendChild(logEntry);
    });
}

// Update button states based on connection
function updateButtonState(connected) {
    connectBtn.disabled = connected;
    disconnectBtn.disabled = !connected;
    toolSelect.disabled = !connected;
    
    if (!connected) {
        toolParams.style.display = 'none';
        callToolBtn.disabled = true;
    }
}

// Handle server type selection
function handleServerTypeChange() {
    const serverType = serverTypeSelect.value;
    if (serverType !== 'custom') {
        serverUrlInput.value = SERVER_PRESETS[serverType];
    }
}

// Connect to the MCP server
async function connect() {
    try {
        const serverUrl = serverUrlInput.value;
        log(`Connecting to ${serverUrl}...`);
        
        // Create client instance
        mcpClient = new Client({
            name: "simple-mcp-demo",
            version: "1.0.0"
        });
        
        // Create and set up transport
        const sseUrl = `${serverUrl}/sse`;
        transport = new SSEClientTransport(new URL(sseUrl));
        
        // Connect to the server
        await mcpClient.connect(transport);
        log('Connected to server!');
        
        // List available tools
        const toolsResult = await mcpClient.listTools();
        toolsInfo = toolsResult.tools || [];
        log(`Available tools: ${toolsInfo.map(t => t.name).join(', ')}`);
        
        // Log tool schemas for debugging
        console.log('Tool schemas:', toolsInfo);
        
        // More detailed debugging of each tool schema
        toolsInfo.forEach(tool => {
            debugLog(`------ TOOL: ${tool.name} ------`);
            debugLog('Complete tool object:', tool);
            debugLog('parameters property:', tool.parameters);
            debugLog('parameterSchema property:', tool.parameterSchema);
            
            // Try to extract schema from various possible locations
            if (tool.schema) debugLog('schema property:', tool.schema);
            if (tool.input_schema) debugLog('input_schema property:', tool.input_schema);
            if (tool.inputSchema) debugLog('inputSchema property:', tool.inputSchema);
        });
        
        // Populate tool select dropdown
        populateToolSelect(toolsInfo);
        
        // Show server info
        showResults({
            server: serverUrl,
            serverType: serverTypeSelect.value,
            toolCount: toolsInfo.length,
            tools: toolsInfo.map(t => t.name)
        });
        
        // Enable buttons
        updateButtonState(true);
        
    } catch (error) {
        log(`Connection error: ${error.message}`);
        console.error('Connection error:', error);
        mcpClient = null;
        updateButtonState(false);
    }
}

// Disconnect from the server
async function disconnect() {
    if (mcpClient && transport) {
        try {
            // Close the transport
            transport.close();
            log('Disconnected from server');
        } catch (error) {
            log(`Error disconnecting: ${error.message}`);
        } finally {
            mcpClient = null;
            transport = null;
            updateButtonState(false);
            
            // Clear tool select
            toolSelect.innerHTML = '<option value="">-- Select a tool --</option>';
            toolsInfo = [];
            
            showResults('Disconnected');
        }
    }
}

// Populate tool select dropdown
function populateToolSelect(tools) {
    toolSelect.innerHTML = '<option value="">-- Select a tool --</option>';
    
    tools.forEach(tool => {
        const option = document.createElement('option');
        option.value = tool.name;
        option.textContent = tool.name;
        toolSelect.appendChild(option);
    });
}

// Handle tool selection
function handleToolSelection() {
    const selectedToolName = toolSelect.value;
    
    if (!selectedToolName) {
        toolParams.style.display = 'none';
        callToolBtn.disabled = true;
        return;
    }
    
    const selectedTool = toolsInfo.find(t => t.name === selectedToolName);
    
    if (selectedTool) {
        // Clear previous params
        paramsContainer.innerHTML = '';
        
        // Show tool description if available
        if (selectedTool.description) {
            const descDiv = document.createElement('div');
            descDiv.className = 'field';
            descDiv.innerHTML = `<strong>Description:</strong> ${selectedTool.description}`;
            paramsContainer.appendChild(descDiv);
        }
        
        // Get parameters for this tool - check multiple possible locations
        let params = {};
        let paramSource = 'none';
        
        // First priority - check inputSchema (this is what Dgraph MCP Server uses)
        if (selectedTool.inputSchema && selectedTool.inputSchema.properties) {
            params = selectedTool.inputSchema.properties;
            paramSource = 'inputSchema.properties';
        }
        // Second priority - check parameters property
        else if (selectedTool.parameters && Object.keys(selectedTool.parameters).length > 0) {
            params = selectedTool.parameters;
            paramSource = 'parameters';
        }
        // Third priority - check parameterSchema
        else if (selectedTool.parameterSchema) {
            try {
                if (typeof selectedTool.parameterSchema === 'string') {
                    try {
                        const parsed = JSON.parse(selectedTool.parameterSchema);
                        if (parsed.properties) {
                            params = parsed.properties;
                            paramSource = 'parameterSchema.properties (string)';
                        }
                    } catch (parseError) {
                        console.error('Error parsing parameterSchema string:', parseError);
                    }
                } else if (selectedTool.parameterSchema.properties) {
                    params = selectedTool.parameterSchema.properties;
                    paramSource = 'parameterSchema.properties (object)';
                }
            } catch (e) {
                console.error('Error processing parameterSchema:', e);
            }
        }
        // Fourth priority - check schema property
        else if (selectedTool.schema) {
            try {
                if (typeof selectedTool.schema === 'string') {
                    try {
                        const parsed = JSON.parse(selectedTool.schema);
                        if (parsed.properties) {
                            params = parsed.properties;
                            paramSource = 'schema.properties';
                        }
                    } catch (parseError) {
                        console.error('Error parsing schema string:', parseError);
                    }
                } else if (selectedTool.schema.properties) {
                    params = selectedTool.schema.properties;
                    paramSource = 'schema.properties (object)';
                }
            } catch (e) {
                console.error('Error processing schema:', e);
            }
        }
        
        // If we're using run_query and still don't have parameters, try exploring the entire object
        if (selectedTool.name === 'run_query' && Object.keys(params).length === 0) {
            debugLog('Special debug for run_query tool');
            debugLog('Complete run_query tool object:', selectedTool);
            
            // Traverse all properties looking for potential parameter definitions
            for (const key in selectedTool) {
                debugLog(`Examining property ${key}:`, selectedTool[key]);
                if (typeof selectedTool[key] === 'object' && selectedTool[key] !== null) {
                    debugLog(`Property ${key} is an object:`, selectedTool[key]);
                }
            }
        }
        
        debugLog(`Parameters for ${selectedTool.name} (source: ${paramSource}):`, params);
        
        // Show debug information in the results panel
        showResults({ tool: selectedTool.name, parameters: params, source: paramSource }, true);
        
        const paramKeys = Object.keys(params);
        
        if (paramKeys.length > 0) {
            // Create input fields for each parameter
            paramKeys.forEach(key => {
                const paramInfo = params[key];
                const paramType = paramInfo.type || 'string';
                
                const fieldDiv = document.createElement('div');
                fieldDiv.className = 'field';
                
                const label = document.createElement('label');
                label.setAttribute('for', `param-${key}`);
                label.textContent = `${key}${paramInfo.required ? ' *' : ''}:`;
                
                if (paramInfo.description) {
                    const description = document.createElement('small');
                    description.style.display = 'block';
                    description.style.color = '#666';
                    description.textContent = paramInfo.description;
                    label.appendChild(description);
                }
                
                fieldDiv.appendChild(label);
                
                // Different input types based on parameter type
                if (paramType === 'boolean') {
                    const select = document.createElement('select');
                    select.id = `param-${key}`;
                    select.dataset.paramName = key;
                    select.dataset.paramType = paramType;
                    
                    const trueOption = document.createElement('option');
                    trueOption.value = 'true';
                    trueOption.textContent = 'true';
                    
                    const falseOption = document.createElement('option');
                    falseOption.value = 'false';
                    falseOption.textContent = 'false';
                    
                    select.appendChild(trueOption);
                    select.appendChild(falseOption);
                    
                    fieldDiv.appendChild(select);
                } else if (paramType === 'array' || paramType === 'object') {
                    const textarea = document.createElement('textarea');
                    textarea.id = `param-${key}`;
                    textarea.dataset.paramName = key;
                    textarea.dataset.paramType = paramType;
                    textarea.placeholder = `Enter ${paramType === 'array' ? 'JSON array' : 'JSON object'}`;
                    
                    fieldDiv.appendChild(textarea);
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.id = `param-${key}`;
                    input.dataset.paramName = key;
                    input.dataset.paramType = paramType;
                    
                    fieldDiv.appendChild(input);
                }
                
                paramsContainer.appendChild(fieldDiv);
            });
        } else {
            // No parameters needed
            const noParamsDiv = document.createElement('div');
            noParamsDiv.textContent = 'This tool does not require any parameters.';
            paramsContainer.appendChild(noParamsDiv);
        }
        
        // Show parameters card and enable call button
        toolParams.style.display = 'block';
        callToolBtn.disabled = false;
    }
}

// Call the selected tool with provided parameters
async function callTool() {
    if (!mcpClient) {
        log('Not connected to server');
        return;
    }
    
    const selectedToolName = toolSelect.value;
    
    if (!selectedToolName) {
        log('No tool selected');
        return;
    }
    
    try {
        // Gather parameters
        const toolArgs = {};
        const paramInputs = paramsContainer.querySelectorAll('[data-param-name]');
        
        paramInputs.forEach(input => {
            const paramName = input.dataset.paramName;
            const paramType = input.dataset.paramType;
            let value = input.value;
            
            // Convert value based on type
            if (paramType === 'number' || paramType === 'integer') {
                value = Number(value);
            } else if (paramType === 'boolean') {
                value = value === 'true';
            } else if ((paramType === 'array' || paramType === 'object') && value) {
                try {
                    value = JSON.parse(value);
                } catch (error) {
                    throw new Error(`Invalid JSON for parameter ${paramName}: ${error.message}`);
                }
            }
            
            // Only add non-empty values
            if (value !== undefined && value !== '') {
                toolArgs[paramName] = value;
            }
        });
        
        log(`Calling tool: ${selectedToolName}`);
        
        // Call the tool
        const result = await mcpClient.callTool({
            name: selectedToolName,
            arguments: toolArgs
        });
        
        log(`Tool ${selectedToolName} called successfully`);
        showResults(result);
        
    } catch (error) {
        log(`Error calling tool: ${error.message}`);
        showResults({ error: error.message });
    }
}

// Toggle debug panel visibility
function toggleDebugPanel() {
    const debugInfo = document.getElementById('debugInfo');
    if (debugInfo.style.display === 'none') {
        debugInfo.style.display = 'block';
    } else {
        debugInfo.style.display = 'none';
    }
}

// Clear debug logs
function clearDebugLogs() {
    debugLogs = [];
    updateDebugDisplay();
}

// Set up event listeners once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set up server type change handler
    serverTypeSelect.addEventListener('change', handleServerTypeChange);
    
    // Initialize server URL based on default selection
    handleServerTypeChange();
    
    // Connect/disconnect buttons
    connectBtn.addEventListener('click', connect);
    disconnectBtn.addEventListener('click', disconnect);
    
    // Tool selection
    toolSelect.addEventListener('change', handleToolSelection);
    
    // Call tool button
    callToolBtn.addEventListener('click', callTool);
    
    // Debug panel toggle
    const toggleDebugBtn = document.getElementById('toggleDebug');
    if (toggleDebugBtn) {
        toggleDebugBtn.addEventListener('click', toggleDebugPanel);
    }
    
    // Initialize debug panel state
    const debugInfo = document.getElementById('debugInfo');
    if (debugInfo) {
        debugInfo.style.display = 'block';
    }
});
