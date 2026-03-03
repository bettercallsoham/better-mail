import { Client } from "@elastic/elasticsearch";
import { logger } from "../../shared/utils/logger";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DateRange {
  from: string;
  to: string;
}

export interface SenderInfo {
  email: string;
  name?: string;
  volume: number;
  readRate: number;
  hasAttachments: boolean;
}

export interface SenderAnalyticsData {
  topSenders: SenderInfo[];
  newsletterRatio: number; // 0-100
  humanRatio: number; // 0-100
  attachmentSenders: SenderInfo[];
  totalReceived: number;
  dateRange: DateRange;
}

export interface InboxHealthData {
  score: number; // 0-100
  stateDistribution: Record<string, number>;
  avgSnoozeDays: number;
  snoozeWeeklyBuckets: { week: string; count: number }[];
  abandonedDrafts: number;
  labelGrowth: {
    month: string;
    topLabels: { label: string; count: number }[];
  }[];
  dateRange: DateRange;
}

export interface ReplyLatency {
  p50Minutes: number;
  p90Minutes: number;
}

export interface ResponseAnalyticsData {
  p50MinutesToReply: number;
  p90MinutesToReply: number;
  sentByHour: Record<string, number>;
  bestSendHour: number;
  bestSendDayOfWeek: string;
  dateRange: DateRange;
}

// ── Service ────────────────────────────────────────────────────────────────────

const EMAILS_INDEX = "emails_v1";

type Period = "daily" | "weekly" | "monthly";

function getDateRange(period: Period): DateRange {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;

  switch (period) {
    case "daily":
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "weekly":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "monthly":
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  return { from: from.toISOString(), to };
}

/** Compute p50 / p90 from a sorted array of numbers */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export class AnalyticsService {
  private readonly client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  // ── Sender Analytics ──────────────────────────────────────────────────────

  async getSenderAnalytics(
    emailAddresses: string[],
    period: Period,
  ): Promise<SenderAnalyticsData> {
    const dateRange = getDateRange(period);

    const result = await this.client.search({
      index: EMAILS_INDEX,
      size: 0,
      query: {
        bool: {
          must: [
            { terms: { emailAddress: emailAddresses } },
            {
              range: { receivedAt: { gte: dateRange.from, lte: dateRange.to } },
            },
            { term: { isDraft: false } },
          ],
        },
      },
      aggs: {
        total_received: {
          filter: { terms: { "to.email": emailAddresses } },
        },
        // Top senders with per-sender read rate
        top_senders: {
          filter: { terms: { "to.email": emailAddresses } },
          aggs: {
            by_sender: {
              terms: { field: "from.email", size: 20 },
              aggs: {
                read_count: {
                  filter: { term: { isRead: true } },
                },
                has_attachment: {
                  filter: { term: { hasAttachments: true } },
                },
                top_name: {
                  top_hits: {
                    size: 1,
                    _source: ["from.name", "from.email"],
                  },
                },
              },
            },
          },
        },
        // Newsletter vs promo detection via provider labels
        newsletter_count: {
          filter: {
            bool: {
              must: [
                { terms: { "to.email": emailAddresses } },
                {
                  terms: {
                    providerLabels: [
                      "CATEGORY_PROMOTIONS",
                      "CATEGORY_UPDATES",
                      "CATEGORY_SOCIAL",
                    ],
                  },
                },
              ],
            },
          },
        },
        // Senders with most attachments
        attachment_senders: {
          filter: {
            bool: {
              must: [
                { terms: { "to.email": emailAddresses } },
                { term: { hasAttachments: true } },
              ],
            },
          },
          aggs: {
            by_sender: {
              terms: { field: "from.email", size: 10 },
              aggs: {
                read_count: {
                  filter: { term: { isRead: true } },
                },
                top_name: {
                  top_hits: {
                    size: 1,
                    _source: ["from.name", "from.email"],
                  },
                },
              },
            },
          },
        },
      },
    });

    const aggs = result.aggregations as any;
    const totalReceived: number = aggs.total_received?.doc_count ?? 0;
    const newsletterCount: number = aggs.newsletter_count?.doc_count ?? 0;

    // Build top senders
    const topSenders: SenderInfo[] = (
      aggs.top_senders?.by_sender?.buckets ?? []
    ).map((b: any) => {
      const topHit = b.top_name?.hits?.hits?.[0]?._source;
      return {
        email: b.key,
        name: topHit?.from?.name || undefined,
        volume: b.doc_count,
        readRate:
          b.doc_count > 0
            ? Math.round((b.read_count.doc_count / b.doc_count) * 100)
            : 0,
        hasAttachments: b.has_attachment?.doc_count > 0,
      };
    });

    // Build attachment senders
    const attachmentSenders: SenderInfo[] = (
      aggs.attachment_senders?.by_sender?.buckets ?? []
    ).map((b: any) => {
      const topHit = b.top_name?.hits?.hits?.[0]?._source;
      return {
        email: b.key,
        name: topHit?.from?.name || undefined,
        volume: b.doc_count,
        readRate:
          b.doc_count > 0
            ? Math.round((b.read_count.doc_count / b.doc_count) * 100)
            : 0,
        hasAttachments: true,
      };
    });

    const newsletterRatio =
      totalReceived > 0
        ? Math.round((newsletterCount / totalReceived) * 100)
        : 0;

    // When there's no data at all both ratios are 0 ("no data"), not 100/0
    const humanRatio = totalReceived > 0 ? Math.max(0, 100 - newsletterRatio) : 0;

    return {
      topSenders,
      newsletterRatio,
      humanRatio,
      attachmentSenders,
      totalReceived,
      dateRange,
    };
  }

  // ── Inbox Health ────────────────────────────────────────────────────────────

  async getInboxHealth(
    emailAddresses: string[],
    period: Period,
  ): Promise<InboxHealthData> {
    const dateRange = getDateRange(period);

    const result = await this.client.search({
      index: EMAILS_INDEX,
      size: 0,
      query: {
        bool: {
          must: [
            { terms: { emailAddress: emailAddresses } },
            {
              range: { receivedAt: { gte: dateRange.from, lte: dateRange.to } },
            },
            { term: { isDraft: false } },
          ],
        },
      },
      aggs: {
        // Inbox state distribution
        inbox_state: {
          terms: { field: "inboxState", size: 10 },
        },
        // Snoozed items with snooze-until distribution
        snoozed_emails: {
          filter: { term: { inboxState: "SNOOZED" } },
          aggs: {
            snooze_by_week: {
              date_histogram: {
                field: "snoozeUntil",
                calendar_interval: "week",
                format: "yyyy-MM-dd",
              },
            },
            avg_snooze_until: {
              avg: { field: "snoozeUntil" },
            },
            avg_received_at: {
              avg: { field: "receivedAt" },
            },
          },
        },
        // Abandoned drafts: drafts last edited > 2 days ago
        abandoned_drafts: {
          filter: {
            bool: {
              must: [
                { term: { isDraft: true } },
                {
                  range: {
                    "draftData.lastEditedAt": { lte: "now-2d" },
                  },
                },
              ],
            },
          },
        },
        // Label growth — last 6 months, monthly, top 5 labels per month
        label_growth: {
          filter: {
            range: {
              receivedAt: {
                gte: "now-6M",
                lte: "now",
              },
            },
          },
          aggs: {
            by_month: {
              date_histogram: {
                field: "receivedAt",
                calendar_interval: "month",
                format: "yyyy-MM",
              },
              aggs: {
                top_labels: {
                  terms: { field: "labels", size: 5 },
                },
              },
            },
          },
        },
      },
    });

    const aggs = result.aggregations as any;

    // State distribution
    const stateDistribution: Record<string, number> = {};
    let totalInStateWindow = 0;
    (aggs.inbox_state?.buckets ?? []).forEach((b: any) => {
      stateDistribution[b.key] = b.doc_count;
      totalInStateWindow += b.doc_count;
    });

    // Score: (DONE + ARCHIVED) / total * 100, clamped 0-100
    const done = stateDistribution["DONE"] ?? 0;
    const archived = stateDistribution["ARCHIVED"] ?? 0;
    const score =
      totalInStateWindow > 0
        ? Math.min(
            100,
            Math.round(((done + archived) / totalInStateWindow) * 100),
          )
        : 100; // If no emails — perfect score

    // Snooze weekly buckets
    const snoozeWeeklyBuckets: { week: string; count: number }[] = (
      aggs.snoozed_emails?.snooze_by_week?.buckets ?? []
    ).map((b: any) => ({ week: b.key_as_string, count: b.doc_count }));

    // Avg snooze distance in days
    const avgSnoozeUntilMs: number =
      aggs.snoozed_emails?.avg_snooze_until?.value ?? 0;
    const avgReceivedMs: number =
      aggs.snoozed_emails?.avg_received_at?.value ?? 0;
    const avgSnoozeDays =
      avgSnoozeUntilMs && avgReceivedMs
        ? Math.max(
            0,
            Math.round(
              (avgSnoozeUntilMs - avgReceivedMs) / (1000 * 60 * 60 * 24),
            ),
          )
        : 0;

    // Abandoned drafts count
    const abandonedDrafts: number = aggs.abandoned_drafts?.doc_count ?? 0;

    // Label growth
    const labelGrowth = (aggs.label_growth?.by_month?.buckets ?? []).map(
      (b: any) => ({
        month: b.key_as_string as string,
        topLabels: (b.top_labels?.buckets ?? []).map((lb: any) => ({
          label: lb.key as string,
          count: lb.doc_count as number,
        })),
      }),
    );

    return {
      score,
      stateDistribution,
      avgSnoozeDays,
      snoozeWeeklyBuckets,
      abandonedDrafts,
      labelGrowth,
      dateRange,
    };
  }

  // ── Response Analytics ──────────────────────────────────────────────────────

  async getResponseAnalytics(
    emailAddresses: string[],
    period: "weekly" | "monthly",
  ): Promise<ResponseAnalyticsData> {
    const dateRange = getDateRange(period);

    const result = await this.client.search({
      index: EMAILS_INDEX,
      size: 0,
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  { terms: { emailAddress: emailAddresses } },
                  { terms: { "from.email": emailAddresses } },
                ],
                minimum_should_match: 1,
              },
            },
            {
              range: { receivedAt: { gte: dateRange.from, lte: dateRange.to } },
            },
            { term: { isDraft: false } },
          ],
        },
      },
      aggs: {
        // Sent volume by hour of day
        sent_by_hour: {
          filter: { terms: { "from.email": emailAddresses } },
          aggs: {
            by_hour: {
              date_histogram: {
                field: "sentAt",
                calendar_interval: "hour",
                format: "H",
              },
            },
            by_day: {
              date_histogram: {
                field: "sentAt",
                calendar_interval: "day",
                format: "EEEE",
              },
            },
          },
        },
        // For reply latency: get sent emails grouped by threadId
        // top_hits per thread lets us compare inbound receivedAt vs outbound sentAt
        reply_threads: {
          filter: { terms: { "from.email": emailAddresses } },
          aggs: {
            by_thread: {
              terms: { field: "threadId", size: 500 },
              aggs: {
                thread_emails: {
                  top_hits: {
                    size: 5,
                    _source: [
                      "sentAt",
                      "receivedAt",
                      "from.email",
                      "emailAddress",
                    ],
                    sort: [{ sentAt: { order: "asc" } }],
                  },
                },
              },
            },
          },
        },
        // Also get inbound emails for same threads (to compute the delta)
        inbound_thread_times: {
          filter: {
            bool: {
              must: [
                { terms: { emailAddress: emailAddresses } },
                { terms: { "to.email": emailAddresses } },
              ],
            },
          },
          aggs: {
            by_thread: {
              terms: { field: "threadId", size: 500 },
              aggs: {
                first_inbound: {
                  top_hits: {
                    size: 1,
                    _source: ["receivedAt", "threadId"],
                    sort: [{ receivedAt: { order: "asc" } }],
                  },
                },
              },
            },
          },
        },
      },
    });

    const aggs = result.aggregations as any;

    // ── Sent by hour ────────────────────────────────────────────────────────
    const sentByHour: Record<string, number> = {};
    for (let i = 0; i < 24; i++) sentByHour[i.toString()] = 0;

    (aggs.sent_by_hour?.by_hour?.buckets ?? []).forEach((b: any) => {
      const h = b.key_as_string;
      sentByHour[h] = (sentByHour[h] ?? 0) + b.doc_count;
    });

    // Best send hour = hour with most sent emails
    let bestSendHour = 9; // sensible default
    let bestSendHourCount = -1;
    Object.entries(sentByHour).forEach(([h, count]) => {
      if (count > bestSendHourCount) {
        bestSendHourCount = count;
        bestSendHour = parseInt(h, 10);
      }
    });

    // Best send day of week
    const sentByDay: Record<string, number> = {};
    (aggs.sent_by_hour?.by_day?.buckets ?? []).forEach((b: any) => {
      const d = b.key_as_string;
      sentByDay[d] = (sentByDay[d] ?? 0) + b.doc_count;
    });
    const bestSendDayOfWeek =
      Object.entries(sentByDay).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "N/A";

    // ── Reply latency (server-side p50 / p90) ──────────────────────────────
    // Build lookup: threadId → first inbound receivedAt
    const inboundByThread = new Map<string, number>();
    (aggs.inbound_thread_times?.by_thread?.buckets ?? []).forEach((b: any) => {
      const hit = b.first_inbound?.hits?.hits?.[0]?._source;
      if (hit?.receivedAt) {
        inboundByThread.set(b.key, new Date(hit.receivedAt).getTime());
      }
    });

    // For each reply thread, compute delta between first inbound and first outbound
    const latencies: number[] = [];
    (aggs.reply_threads?.by_thread?.buckets ?? []).forEach((tb: any) => {
      const inboundTs = inboundByThread.get(tb.key);
      if (!inboundTs) return;

      const hits: any[] = tb.thread_emails?.hits?.hits ?? [];
      for (const hit of hits) {
        const src = hit._source;
        // Only consider emails sent by the user (not received)
        if (!emailAddresses.includes(src?.from?.email ?? "")) continue;
        const sentTs = src?.sentAt ? new Date(src.sentAt).getTime() : null;
        if (!sentTs) continue;
        const deltaMinutes = (sentTs - inboundTs) / (1000 * 60);
        if (deltaMinutes > 0 && deltaMinutes < 60 * 24 * 14) {
          // cap at 14 days to exclude stale threads
          latencies.push(deltaMinutes);
        }
        break; // only first reply per thread
      }
    });

    latencies.sort((a, b) => a - b);
    const p50 = Math.round(percentile(latencies, 50));
    const p90 = Math.round(percentile(latencies, 90));

    return {
      p50MinutesToReply: p50,
      p90MinutesToReply: p90,
      sentByHour,
      bestSendHour,
      bestSendDayOfWeek,
      dateRange,
    };
  }
}
