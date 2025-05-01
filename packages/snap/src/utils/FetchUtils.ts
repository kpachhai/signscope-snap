export type FetchResponse = {
  success: boolean;
  data: any;
  error: string | undefined;
};

/**
 * Provides utilities for interacting with Hedera Wallet Snap functionalities.
 */
export class FetchUtils {
  /**
   * Retrieve results using hedera mirror node.
   *
   * @param url - The URL to use to query.
   * @returns A promise that resolves to the fetch response.
   */
  public static async fetchDataFromUrl(
    url: RequestInfo | URL,
  ): Promise<FetchResponse> {
    let data;
    let error;

    const response = await fetch(url);

    if (response.ok) {
      data = await response.json();
    } else {
      error = `Network response was not ok. Status: ${response.status} ${response.statusText}`;
    }

    return {
      success: response.ok,
      data,
      error,
    };
  }
}
