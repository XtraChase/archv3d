// AWS calls of the control Worker, signed with SigV4 (aws4fetch) as the IAM user archv3d-control, which may describe
// instances, start/stop and tag the one named INSTANCE_NAME, and read Cost Explorer.
import { AwsClient } from 'aws4fetch';
import type { Env } from './http';

export interface Instance {
  id: string;
  state: string;
  wake: string;
  type: string;
  launchTime: string;
}

// The configured region, or us-west-2 when it's missing or not a region name (a dashboard secret named AWS_REGION
// once replaced it, and deleting that secret removed the setting until the next deploy from the repo).
export const region = (env: Env) => (/^[a-z]{2}(-[a-z]+)+-\d$/.test(env.AWS_REGION ?? '') ? env.AWS_REGION : 'us-west-2');

const client = (env: Env, service: string, signingRegion: string) =>
  new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID!.trim(),
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!.trim(),
    service,
    region: signingRegion
  });

export const hasAwsKey = (env: Env) => Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);

// ---- EC2 (query API) -----------------------------------------------------------------------------

async function ec2(env: Env, params: Record<string, string>) {
  const url = new URL(`https://ec2.${region(env)}.amazonaws.com/`);
  url.search = new URLSearchParams({ Version: '2016-11-15', ...params }).toString();
  const response = await client(env, 'ec2', region(env)).fetch(url.href);
  const text = await response.text();
  if (!response.ok) throw new Error(`EC2 ${params.Action} ${response.status}: ${text.slice(0, 400)}`);
  return text;
}

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1] ?? '';

export async function findInstance(env: Env): Promise<Instance | null> {
  const xml = await ec2(env, {
    Action: 'DescribeInstances',
    'Filter.1.Name': 'tag:Name',
    'Filter.1.Value.1': env.INSTANCE_NAME,
    'Filter.2.Name': 'instance-state-name',
    'Filter.2.Value.1': 'pending',
    'Filter.2.Value.2': 'running',
    'Filter.2.Value.3': 'stopping',
    'Filter.2.Value.4': 'stopped'
  });
  const item = xml.match(/<instancesSet>\s*<item>([\s\S]*?)<\/instancesSet>/)?.[1];
  if (!item) return null;
  const state = item.match(/<instanceState>([\s\S]*?)<\/instanceState>/)?.[1] ?? '';
  const wake = item.match(/<item>\s*<key>archv3d-wake<\/key>\s*<value>([^<]*)<\/value>/)?.[1] ?? '';
  return {
    id: tag(item, 'instanceId'),
    state: tag(state, 'name'),
    wake,
    type: tag(item, 'instanceType'),
    launchTime: tag(item, 'launchTime')
  };
}

export const startInstance = (env: Env, id: string) => ec2(env, { Action: 'StartInstances', 'InstanceId.1': id });
export const stopInstance = (env: Env, id: string) => ec2(env, { Action: 'StopInstances', 'InstanceId.1': id });
export const setWake = (env: Env, id: string, on: boolean) =>
  ec2(env, {
    Action: 'CreateTags',
    'ResourceId.1': id,
    'Tag.1.Key': 'archv3d-wake',
    'Tag.1.Value': on ? 'on' : 'off'
  });

// ---- Cost Explorer (JSON API, us-east-1; $0.01 per request, so callers cache) --------------------------

export interface Costs {
  monthToDate: number;
  currency: string;
  byService: { service: string; amount: number }[];
  from: string;
  to: string;
}

export async function monthToDateCosts(env: Env): Promise<Costs> {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const response = await client(env, 'ce', 'us-east-1').fetch('https://ce.us-east-1.amazonaws.com/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSInsightsIndexService.GetCostAndUsage'
    },
    body: JSON.stringify({
      TimePeriod: { Start: from, End: to },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Cost Explorer ${response.status}: ${text.slice(0, 400)}`);
  const data = JSON.parse(text) as {
    ResultsByTime: { Groups: { Keys: string[]; Metrics: { UnblendedCost: { Amount: string; Unit: string } } }[] }[];
  };
  const groups = data.ResultsByTime.flatMap((period) => period.Groups);
  const byService = groups
    .map((group) => ({ service: group.Keys[0], amount: Number(group.Metrics.UnblendedCost.Amount) }))
    .filter((entry) => entry.amount >= 0.005)
    .sort((a, b) => b.amount - a.amount);
  return {
    monthToDate: byService.reduce((sum, entry) => sum + entry.amount, 0),
    currency: groups[0]?.Metrics.UnblendedCost.Unit ?? 'USD',
    byService,
    from,
    to
  };
}
