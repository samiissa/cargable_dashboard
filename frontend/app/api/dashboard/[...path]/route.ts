import { handleDashboardProxy } from "../../../../src/api/dashboard-proxy";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function handle(request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  return handleDashboardProxy(request, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
