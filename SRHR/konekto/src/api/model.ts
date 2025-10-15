import RNFS from "react-native-fs";

export const downloadModel = async (
  modelName: string,
  modelUrl: string,
  onProgress: (progress: number) => void
): Promise<string> => {
  try {
    const destPath = `${RNFS.DocumentDirectoryPath}/${modelName}`;

    // Remove if existing
    if (await RNFS.exists(destPath)) {
      await RNFS.unlink(destPath);
      console.log(`Deleted existing file at ${destPath}`);
    }

    console.log("Starting download from:", modelUrl); 

    const download = RNFS.downloadFile({
      fromUrl: modelUrl,
      toFile: destPath,
      background: true,
      discretionary: true,
      progress: res => {
        const progress = (res.bytesWritten / res.contentLength) * 100;
        onProgress(Math.floor(progress));
      },
      progressDivider: 1,
    });

    const result = await download.promise;
    if (result.statusCode === 200) {
      console.log("Download complete:", destPath);
      return `file://${destPath}`;
    } else {
      throw new Error(`HTTP ${result.statusCode}`);
    }
  } catch (error) {
    throw new Error(`Failed to download model: ${error.message}`);
  }
};
