import * as FileSystem from "expo-file-system/legacy";

export const downloadModel = async (
  modelName: string,
  modelUrl: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  try {
    if (!modelName || !modelUrl) {
      throw new Error("Invalid model name or URL");
    }

    const destPath = `${FileSystem.documentDirectory}${modelName}`;

    // Delete existing file if it exists
    const fileInfo = await FileSystem.getInfoAsync(destPath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(destPath, { idempotent: true });
      console.log(`Deleted existing file at ${destPath}`);
    }

    console.log("Starting download from:", modelUrl);

    
    // Set up download with progress tracking

    const downloadResumable = FileSystem.createDownloadResumable(
      modelUrl,
      destPath,
      {},
      (downloadProgress) => {
        const progress =
          (downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite) *
          100;
        console.log("Download progress:", progress);
        onProgress(Math.floor(progress));
      }
    );

    const { uri } = await downloadResumable.downloadAsync();

    console.log("Download completed:", uri);
    return uri;
  } catch (error) {
    throw new Error(
      `Failed to download model: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};



