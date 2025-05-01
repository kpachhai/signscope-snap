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

export async function fetchABI(contractAddres: string) {
  try {
    const response = await fetch(
      `https://server-verify.hashscan.io/files/any/296/${contractAddres}`,
    );
    console.log('Response:', response);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data.files[0].content;
  } catch (error) {
    console.error('Fetch error:', error);
  }
}
