import { elasticClient } from "../../config/elastic";
import { logger } from "../../utils/logger";

const THREADS_INDEX = "threads_v1";
const MAX_NOTE_LENGTH = 10000;

export interface ThreadNote {
  threadId: string;
  emailAddress: string;
  notes: string;
  requiresAction: boolean;
  reminder?: {
    remindAt: string;
    status: string;
  };
  lastActivityAt: string;
}

export interface ListNotesResult {
  notes: ThreadNote[];
  total: number;
}

export class ThreadNoteService {
  /**
   * Upsert a note for a thread (create or update)
   */
  async upsertNote(
    emailAddress: string,
    threadId: string,
    notes: string,
  ): Promise<ThreadNote> {
    if (notes.length > MAX_NOTE_LENGTH) {
      throw new Error(
        `Note content exceeds maximum length of ${MAX_NOTE_LENGTH} characters`,
      );
    }

    const docId = `${emailAddress}_${threadId}`;
    const now = new Date().toISOString();

    try {
      const noteData: ThreadNote = {
        threadId,
        emailAddress,
        notes,
        requiresAction: false,
        lastActivityAt: now,
      };

      await elasticClient.index({
        index: THREADS_INDEX,
        id: docId,
        document: noteData,
        refresh: "wait_for",
      });

      return noteData;
    } catch (error: any) {
      logger.error(`Error upserting thread note: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a note for a specific thread
   */
  async getNote(
    emailAddress: string,
    threadId: string,
  ): Promise<ThreadNote | null> {
    const docId = `${emailAddress}_${threadId}`;

    try {
      const result = await elasticClient.get({
        index: THREADS_INDEX,
        id: docId,
      });

      return result._source as ThreadNote;
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        return null;
      }
      logger.error(`Error fetching thread note: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a note for a specific thread
   */
  async deleteNote(emailAddress: string, threadId: string): Promise<boolean> {
    const docId = `${emailAddress}_${threadId}`;

    try {
      await elasticClient.delete({
        index: THREADS_INDEX,
        id: docId,
        refresh: "wait_for",
      });

      return true;
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        return false;
      }
      logger.error(`Error deleting thread note: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all notes for email addresses with pagination
   */
  async listNotes(
    emailAddresses: string[],
    limit: number = 50,
    offset: number = 0,
    query?: string,
  ): Promise<ListNotesResult> {
    try {
      logger.info(
        `Listing notes for emails: ${JSON.stringify(emailAddresses)}`,
      );

      const trimmed = query?.trim();

      const esQuery = trimmed
        ? {
            bool: {
              must: [
                {
                  match: {
                    notes: {
                      query: trimmed,
                      fuzziness: "AUTO",
                      operator: "or",
                    },
                  },
                },
              ],
              filter: [{ terms: { "emailAddress.keyword": emailAddresses } }],
            },
          }
        : {
            bool: {
              filter: [{ terms: { "emailAddress.keyword": emailAddresses } }],
            },
          };

      const result = await elasticClient.search({
        index: THREADS_INDEX,
        query: esQuery as any,
        size: limit,
        from: offset,
        sort: [
          {
            lastActivityAt: {
              order: "desc",
            },
          },
        ],
      });

      const notes = result.hits.hits.map(
        (hit: any) => hit._source as ThreadNote,
      );

      const total =
        typeof result.hits.total === "number"
          ? result.hits.total
          : (result.hits.total?.value ?? 0);

      return { notes, total };
    } catch (error: any) {
      logger.error(`Error listing thread notes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get notes for multiple threads at once (batch fetch)
   */
  async getNotesForThreads(
    emailAddresses: string[],
    threadIds: string[],
  ): Promise<Map<string, ThreadNote>> {
    if (threadIds.length === 0) {
      return new Map();
    }

    try {
      const result = await elasticClient.search({
        index: THREADS_INDEX,
        query: {
          bool: {
            must: [
              { terms: { emailAddress: emailAddresses } },
              { terms: { threadId: threadIds } },
            ],
          },
        },
        size: threadIds.length,
      });

      const notesMap = new Map<string, ThreadNote>();
      result.hits.hits.forEach((hit: any) => {
        const note = hit._source as ThreadNote;
        notesMap.set(note.threadId, note);
      });

      return notesMap;
    } catch (error: any) {
      logger.error(`Error fetching notes for threads: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete all notes for email addresses (cleanup)
   */
  async deleteAllEmailNotes(emailAddresses: string[]): Promise<number> {
    try {
      const result = await elasticClient.deleteByQuery({
        index: THREADS_INDEX,
        query: {
          terms: { emailAddress: emailAddresses },
        },
        refresh: true,
      });

      return result.deleted || 0;
    } catch (error: any) {
      logger.error(`Error deleting email notes: ${error.message}`);
      throw error;
    }
  }
}

export const threadNoteService = new ThreadNoteService();
