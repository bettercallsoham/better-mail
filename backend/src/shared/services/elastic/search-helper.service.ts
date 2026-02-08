import { EmailAccount } from "../../models";
import { ElasticsearchService } from "./elastic.service";
import { elasticClient } from "../../config/elastic";

const elasticService = new ElasticsearchService(elasticClient);

/**
 * Helper service for searching emails by userId
 * Handles the pattern: userId -> email addresses -> ES query
 */
export class EmailSearchHelper {
  /**
   * Search all emails for a specific user across all their connected accounts
   *
   * @param userId - The user's ID
   * @param searchText - Optional search query
   * @param from - Pagination offset (default: 0)
   * @param size - Number of results (default: 20)
   *
   * @example
   * const results = await EmailSearchHelper.searchForUser({
   *   userId: 'user-uuid-123',
   *   searchText: 'meeting notes',
   *   from: 0,
   *   size: 50
   * });
   */
  static async searchForUser(params: {
    userId: string;
    searchText?: string;
    from?: number;
    size?: number;
  }) {
    const { userId, searchText, from = 0, size = 20 } = params;

    // Step 1: Get all email addresses for this user
    const accounts = await EmailAccount.findAll({
      where: { user_id: userId },
      attributes: ["email"],
    });

    if (accounts.length === 0) {
      return {
        total: 0,
        emails: [],
        accountCount: 0,
      };
    }

    const emailAddresses = accounts.map((acc) => acc.email.toLowerCase());

    // Step 2: Query Elasticsearch with all email addresses
    const results = await elasticService.searchEmails({
      emailAddresses,
      searchText,
      from,
      size,
    });

    return {
      ...results,
      accountCount: emailAddresses.length,
    };
  }

  /**
   * Get inbox emails for a user (across all their accounts)
   */
  static async getInboxForUser(params: {
    userId: string;
    from?: number;
    size?: number;
  }) {
    const { userId, from = 0, size = 20 } = params;

    const accounts = await EmailAccount.findAll({
      where: { user_id: userId },
      attributes: ["email"],
    });

    if (accounts.length === 0) {
      return { total: 0, emails: [] };
    }

    const emailAddresses = accounts.map((acc) => acc.email.toLowerCase());

    // Query with inbox filters (not archived, not deleted)
    const result = await elasticClient.search({
      index: "emails_v1",
      from,
      size,
      query: {
        bool: {
          must: [
            { terms: { emailAddress: emailAddresses } },
            { term: { isArchived: false } },
            { term: { isDeleted: false } },
          ],
        },
      },
      sort: [{ receivedAt: "desc" }],
    });

    return {
      total:
        typeof result.hits.total === "number"
          ? result.hits.total
          : result.hits.total?.value || 0,
      emails: result.hits.hits.map((hit) => hit._source),
    };
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCountForUser(userId: string): Promise<number> {
    const accounts = await EmailAccount.findAll({
      where: { user_id: userId },
      attributes: ["email"],
    });

    if (accounts.length === 0) {
      return 0;
    }

    const emailAddresses = accounts.map((acc) => acc.email.toLowerCase());

    const result = await elasticClient.count({
      index: "emails_v1",
      query: {
        bool: {
          must: [
            { terms: { emailAddress: emailAddresses } },
            { term: { isRead: false } },
            { term: { isDeleted: false } },
          ],
        },
      },
    });

    return result.count;
  }
}
