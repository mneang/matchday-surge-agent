import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "matchday_surge";

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable for MCP server");
}

const client = new MongoClient(uri);

async function getDb() {
  if (!client.topology?.isConnected?.()) {
    await client.connect();
  }

  return client.db(dbName);
}

const server = new Server(
  {
    name: "matchday-surge-mongodb-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_matchday_profiles",
        description:
          "List available local business profiles for matchday surge planning.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "load_matchday_context",
        description:
          "Load a business profile, matchday scenario, and readiness template from MongoDB for the selected business.",
        inputSchema: {
          type: "object",
          properties: {
            businessId: {
              type: "string",
              description: "The MongoDB business profile ID to load.",
            },
          },
          required: ["businessId"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const db = await getDb();
  const toolName = request.params.name;

  if (toolName === "list_matchday_profiles") {
    const profiles = await db
      .collection("business_profiles")
      .find(
        {},
        {
          projection: {
            _id: 0,
            businessId: 1,
            name: 1,
            businessType: 1,
            area: 1,
            scenarioId: 1,
            templateId: 1,
          },
        }
      )
      .sort({ businessId: 1 })
      .toArray();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ profiles }, null, 2),
        },
      ],
    };
  }

  if (toolName === "load_matchday_context") {
    const businessId = request.params.arguments?.businessId;

    if (!businessId || typeof businessId !== "string") {
      throw new Error("businessId is required");
    }

    const businessProfile = await db.collection("business_profiles").findOne(
      { businessId },
      { projection: { _id: 0 } }
    );

    if (!businessProfile) {
      throw new Error(`Business profile not found: ${businessId}`);
    }

    const scenarioId =
      typeof businessProfile.scenarioId === "string"
        ? businessProfile.scenarioId
        : "wc2026_restaurant_rush";

    const templateId =
      typeof businessProfile.templateId === "string"
        ? businessProfile.templateId
        : "restaurant_surge_template";

    const matchdayScenario = await db.collection("matchday_scenarios").findOne(
      { scenarioId },
      { projection: { _id: 0 } }
    );

    const readinessTemplate = await db.collection("readiness_templates").findOne(
      { templateId },
      { projection: { _id: 0 } }
    );

    if (!matchdayScenario || !readinessTemplate) {
      throw new Error(
        `Missing scenario or readiness template for businessId: ${businessId}`
      );
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              businessProfile,
              matchdayScenario,
              readinessTemplate,
              mcpToolServer: "matchday-surge-mongodb-mcp",
              mcpToolUsed: "load_matchday_context",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  throw new Error(`Unknown MCP tool: ${toolName}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
