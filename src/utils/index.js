export const calculateDurationInSeconds = (startDate, endDate, startTime, endTime) => {
  const startDateTime = new Date(startDate).getTime() + new Date(startTime).getTime();
  const endDateTime = new Date(endDate).getTime() + new Date(endTime).getTime();
  const duration = endDateTime - startDateTime;
  return Math.floor(duration / 1000); // Convert milliseconds to seconds and return
};

// Function to extract public_ids of images from posts
export const getImagePublicIds = (posts) => {
  const imagePublicIds = [];
  posts.forEach((post) => {
    post.media.forEach((mediaItem) => {
      if (mediaItem.type === "image") {
        imagePublicIds.push(mediaItem.public_id);
      }
    });
  });
  return imagePublicIds;
};

// Function to extract public_ids of videos from posts
export const getVideoPublicIds = (posts) => {
  const videoPublicIds = [];
  posts.forEach((post) => {
    post.media.forEach((mediaItem) => {
      if (mediaItem.type === "video") {
        videoPublicIds.push(mediaItem.public_id);
      }
    });
  });
  return videoPublicIds;
};

export const shufflePosts = (posts) => {
  // Create a copy of the array to avoid mutating the original array
  const shuffledPosts = [...posts];

  // Shuffle the array using the Fisher-Yates algorithm
  for (let i = shuffledPosts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPosts[i], shuffledPosts[j]] = [shuffledPosts[j], shuffledPosts[i]];
  }

  return shuffledPosts;
};
