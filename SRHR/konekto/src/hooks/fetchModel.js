

const fetchAvailableGGUFs = async () => {
  try {
    const response = await axios.get(
      `https://huggingface.co/api/models/unsloth/gemma-3n-E2B-it-GGUF`,
    );

    if (!response.data?.siblings) {
      throw new Error('Invalid API response format');
    }

    const files = response.data.siblings.filter((file: {rfilename: string}) =>
      file.rfilename.endsWith('.gguf'),
    );

    setAvailableGGUFs(files.map((file: {rfilename: string}) => file.rfilename));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch .gguf files';
    Alert.alert('Error', errorMessage);
    setAvailableGGUFs([]);
  }
};




const handleDownloadModel = async (file: string) => {
  const downloadUrl = `https://huggingface.co/${
    HF_TO_GGUF[selectedModelFormat as keyof typeof HF_TO_GGUF]
  }/resolve/main/${file}`;
  // we set the isDownloading state to true to show the progress bar and set the progress to 0
  setIsDownloading(true);
  setProgress(0);

  try {
    
    // we download the model using the downloadModel function, it takes the selected GGUF file, the download URL, and a progress callback function to update the progress bar
    const destPath = await downloadModel(file, downloadUrl, progress =>
      setProgress(progress),
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Download failed due to an unknown error.';
    Alert.alert('Error', errorMessage);
  } finally {
    setIsDownloading(false);
  }
};


export { fetchAvailableGGUFs, handleDownloadModel };