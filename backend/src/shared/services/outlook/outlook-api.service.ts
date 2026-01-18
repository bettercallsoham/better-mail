import axios, { AxiosInstance } from "axios";
import {
  OutlookFolder,
  OutlookMessage,
  OutlookFolderWithMessages,
} from "./interfaces";
import "dotenv/config";
import { refreshOutlookAccessToken } from "../../utils/helpers/outlook-helper";

export class OutlookApiService {
  private client: AxiosInstance;

  constructor(accessToken: string) {
    this.client = axios.create({
      baseURL: "https://graph.microsoft.com/v1.0",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  /**
   * Fetch all mail folders (Inbox, Sent, Archive, custom folders)
   */
  async fetchFolders(): Promise<OutlookFolder[]> {
    const res = await this.client.get("/me/mailFolders");
    return res.data.value;
  }

  /**
   * Fetch messages for a folder for the last N days
   */
  async fetchMessagesForFolder({
    folderId,
    days = 30,
    pageSize = 50,
  }: {
    folderId: string;
    days?: number;
    pageSize?: number;
  }): Promise<OutlookMessage[]> {
    const sinceDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    ).toISOString();

    let url =
      `/me/mailFolders/${folderId}/messages` +
      `?$filter=receivedDateTime ge ${sinceDate}` +
      `&$orderby=receivedDateTime DESC` +
      `&$top=${pageSize}`;

    const messages: OutlookMessage[] = [];

    while (url) {
      const res = await this.client.get(url);
      messages.push(...res.data.value);
      url = res.data["@odata.nextLink"]?.replace(
        "https://graph.microsoft.com/v1.0",
        "",
      );
    }

    return messages;
  }

  /**
   * Fetch folders WITH messages (last 30 days)
   */
  async fetchLast30DaysEmailsWithFolders(): Promise<
    OutlookFolderWithMessages[]
  > {
    const folders = await this.fetchFolders();
    const result: OutlookFolderWithMessages[] = [];

    for (const folder of folders) {
      if (folder.totalItemCount === 0) continue;

      const messages = await this.fetchMessagesForFolder({
        folderId: folder.id,
        days: 30,
      });

      result.push({
        folder,
        messages,
      });
    }

    return result;
  }
}

