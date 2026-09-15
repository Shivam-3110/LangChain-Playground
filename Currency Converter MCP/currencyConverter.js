import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {z} from "zod";
 
// create a MCP server
const server = new McpServer({
    name:"Currency Converter MCP Server",
    version:"1.0.0"
})

server.tool(
    "convertCurrency",
    "Convert amount from one currency to another",
    {
        amount:z.number().describe("Amount to convert for e.g.100 "),
        from:z.string().describe("Base currency code,e.g USD"),
        to:z.string().describe("Target currency code, e.g. INR")
    },
    async({amount , from ,to}) => {
        try {
            return{
                content :[{
                    type:"text",
                    text:"converted currency is "
                }]
            }
            
        } catch (error) {
            return {
                content :[
                    {
                        type:"text",
                        text:`Error:${error.message}`
                    }
                ]
            }
        }
    }
)

// Start the server with stdio transport 
async function startServer(params){
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("MCP convert currency server started ")
}

startServer().catch((error) => {
    console.log("Failed to start MCP server");
    process.exit(1);
})