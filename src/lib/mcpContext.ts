import path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  BusinessProfile,
  MatchdayScenario,
  ReadinessTemplate,
} from "@/lib/types";

type MatchdayMcpContext = {
  businessProfile: BusinessProfile;
  matchdayScenario: MatchdayScenario;
  readinessTemplate: ReadinessTemplate;
  mcpToolServer: string;
  mcpToolUsed: string;
};

function getCleanEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

function getTextContent(result: unknown) {
  const maybeResult = result as {
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  };

  const firstText = maybeResult.content?.find(
    (item) => item.type === "text" && typeof item.text === "string"
  );

  if (!firstText?.text) {
    throw new Error("MCP tool response did not include text content.");
  }

  return firstText.text;
}

export async function loadMatchdayContextViaMcp(
  businessId: string
): Promise<MatchdayMcpContext> {
  const serverPath = path.join(
    process.cwd(),
    "mcp",
    "mongodb-matchday-server.mjs"
  );

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    env: getCleanEnv(),
  });

  const client = new Client({
    name: "matchday-surge-agent-client",
    version: "0.1.0",
  });

  try {
    await client.connect(transport);

    const result = await client.callTool({
      name: "load_matchday_context",
      arguments: {
        businessId,
      },
    });

    return JSON.parse(getTextContent(result)) as MatchdayMcpContext;
  } finally {
    await client.close();
  }
}
