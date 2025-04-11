from toolbox_langchain import ToolboxClient
import langchain
from langchain.memory import ConversationBufferMemory


langchain.verbose = False
langchain.debug = False
langchain.llm_cache = False

import warnings

# Ignore all warnings
warnings.filterwarnings("ignore")



toolbox = ToolboxClient("http://127.0.0.1:5000")

tools = toolbox.load_toolset()

from langchain_google_vertexai import ChatVertexAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
import os



# Initialize a memory component
memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True
)


prompt = ChatPromptTemplate.from_messages([
    ("system", """
     You are a helpful product search assistant. Your job is to help users find products they're looking for.

IMPORTANT: You do not have up-to-date information about specific products, pricing, or availability in your training data. 
You must ALWAYS use the provided tools to search for product information.

Never attempt to provide product details from your training data.
Never make up or hallucinate product information.
Always use your tools when a user asks about specific products.
Always use your tools when more information about a specific product is needed.
Always use your tools when a user asks about reviews."""), 
      MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"), 
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

llm = ChatVertexAI(
	model="gemini-1.5-pro-002", 
	temperature=0, 
	convert_system_message_to_human=False
)

agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, memory=memory,tool_choice="any" )

# Interactive Session
def interactive_agent():
    print("Interactive LangChain Agent Executor. Type 'exit' to quit.")
    while True:
        user_input = input("\nYou: ")
        if user_input.lower() == "exit":
            print("Goodbye!")
            break
        response = agent_executor.invoke({"input": user_input})
        print("\nAgent:", response['output'])

# Run the interactive agent
if __name__ == "__main__":
    interactive_agent()
