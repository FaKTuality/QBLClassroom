
import React from "react";


const getWikimediaCommonsFileUrl = (trimmedUrl) => {
  const wikiRegex = /^https?:\/\/commons\.wikimedia\.org\/wiki\/File:(.+)$/i;
  const match = trimmedUrl.match(wikiRegex);
  if (!match || !match[1]) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(match[1])}`;
};



export const getVideoEmbed = (url, options = {}) => {
  if (!url || typeof url !== "string") return null;

  const trimmedUrl = url.trim();

  // YouTube — delegates entirely to the existing function
  const youtubeUrl = getYouTubeEmbedUrl(trimmedUrl, options);
  if (youtubeUrl) {
    return { type: "iframe", url: youtubeUrl };
  }

  // Giphy — raw/unconverted link (still has the long v1.<hash> path segment).
  // This is the silent preview asset. Only reached when the API resolution
  // failed and the original link was saved as-is, so fall back to a silent
  // but at least playable video by swapping the extension.
  const giphyRawRegex = /^https?:\/\/media\d*\.giphy\.com\/media\/v1\.[^/]+\/[a-zA-Z0-9]+\/giphy\.(?:gif|webp|mp4)$/i;
  if (giphyRawRegex.test(trimmedUrl)) {
    return { type: "video", url: trimmedUrl.replace(/\.(?:gif|webp)$/i, ".mp4") };
  }

  // Giphy — already resolved via the API (no v1.<hash> segment, usually has
  // ?cid=&rid= query params). Already a real sound-included file — leave untouched.
  const giphyResolvedRegex = /^https?:\/\/media\d*\.giphy\.com\/media\/.+\.(?:mp4|gif|webp)(?:\?.*)?$/i;
  if (giphyResolvedRegex.test(trimmedUrl)) {
    return { type: "video", url: trimmedUrl };
  }

  // Google Drive
  const gDriveRegex = /^https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i;
  const gDriveMatch = trimmedUrl.match(gDriveRegex);
  if (gDriveMatch && gDriveMatch[1]) {
    return { type: "iframe", url: `https://drive.google.com/file/d/${gDriveMatch[1]}/preview` };
  }

  // Dropbox
  if (trimmedUrl.includes("dropbox.com/")) {
    try {
      const dropboxUrl = new URL(trimmedUrl);
      dropboxUrl.searchParams.delete("dl");
      dropboxUrl.searchParams.set("raw", "1");
      return { type: "video", url: dropboxUrl.toString() };
    } catch {
      return null;
    }
  }

  return null;
};



const isSafeHttpUrl = (value) => /^https?:\/\//i.test(value);

const getYouTubeEmbedUrl = (url, options = {}) => {
  if (!url || typeof url !== "string") return null;

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
  let videoId = null;

  if (host === "youtu.be") {
    videoId = parsed.pathname.split("/").filter(Boolean)[0] || null;
  } else if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsed.pathname === "/watch") {
      videoId = parsed.searchParams.get("v");
    } else {
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live", "v"].includes(segments[0])) {
        videoId = segments[1] || null;
      }
    }
  } else {
    return null;
  }

  if (!videoId || !/^[\w-]{11}$/.test(videoId)) return null;

  const params = new URLSearchParams();
  if (options.autoplay) params.append("autoplay", "1");
  if (options.controls === false) params.append("controls", "0");

  const queryString = params.toString();
  return `https://www.youtube.com/embed/${videoId}${queryString ? `?${queryString}` : ""}`;
};

export const getDirectImageUrl = (url) => {
  if (!url || typeof url !== "string") return "";

  const trimmedUrl = url.trim();

  const giphyRegex = /^https?:\/\/(?:www\.)?giphy\.com\/gifs\/(?:[\w-]+-)?([a-zA-Z0-9]+)\/?$/i;
  const giphyMatch = trimmedUrl.match(giphyRegex);
  if (giphyMatch && giphyMatch[1]) {
    return `https://i.giphy.com/media/${giphyMatch[1]}/giphy.gif`;
  }

  const gDriveRegex = /^https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i;
  const gDriveMatch = trimmedUrl.match(gDriveRegex);
  if (gDriveMatch && gDriveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gDriveMatch[1]}`;
  }

  if (trimmedUrl.includes("dropbox.com/")) {
    try {
      const dropboxUrl = new URL(trimmedUrl);
      dropboxUrl.searchParams.delete("dl");
      dropboxUrl.searchParams.set("raw", "1");
      return dropboxUrl.toString();
    } catch {
      // fall through
    }
  }

  const wikiUrl = getWikimediaCommonsFileUrl(trimmedUrl);
  if (wikiUrl) return wikiUrl;

  return isSafeHttpUrl(trimmedUrl) ? trimmedUrl : "";
};

export const getAudioEmbed = (url) => {
  if (!url || typeof url !== "string") return null;

  const trimmedUrl = url.trim();

  const gDriveRegex = /^https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i;
  const gDriveMatch = trimmedUrl.match(gDriveRegex);
  if (gDriveMatch && gDriveMatch[1]) {
    return { type: "iframe", url: `https://drive.google.com/file/d/${gDriveMatch[1]}/preview` };
  }

  if (trimmedUrl.includes("dropbox.com/")) {
    try {
      const dropboxUrl = new URL(trimmedUrl);
      dropboxUrl.searchParams.delete("dl");
      dropboxUrl.searchParams.set("raw", "1");
      return { type: "audio", url: dropboxUrl.toString() };
    } catch {
      return null;
    }
  }

  const vocarooRegex = /^https?:\/\/(?:www\.)?(?:vocaroo\.com|voca\.ro)\/([a-zA-Z0-9]+)/i;
  const vocarooMatch = trimmedUrl.match(vocarooRegex);
  if (vocarooMatch && vocarooMatch[1]) {
    return { type: "audio", url: `https://media.vocaroo.com/mp3/${vocarooMatch[1]}` };
  }

  const wikiUrl = getWikimediaCommonsFileUrl(trimmedUrl);
  if (wikiUrl) return { type: "audio", url: wikiUrl };

  return isSafeHttpUrl(trimmedUrl) ? { type: "audio", url: trimmedUrl } : null;
};


export const errorMessages = {
  "auth/user-not-found":
    "No account exists with that email address.",

  "auth/wrong-password":
    "The password you entered is incorrect.",

  "auth/invalid-email":
    "Please enter a valid email address.",

  "auth/email-already-in-use":
    "An account with this email already exists.",

  "auth/weak-password":
    "Your password is too weak. Try using at least 6 characters.",

  "auth/network-request-failed":
    "It looks like you're offline. Please check your internet connection and try again.",

  "auth/too-many-requests":
    "Too many attempts detected. Please wait a few minutes and try again.",

  "permission-denied":
    "You don't have permission to perform this action.",

  "not-found":
    "The requested information could not be found.",

  "unavailable":
    "Our servers are temporarily unavailable. Please try again later.",

  "deadline-exceeded":
    "The request took too long to complete. Please try again."
};

export const parseName = (name, studentId, changedNames) => {
  
  let displayName = name;
  for (let key in changedNames) {
    if(key === (studentId)) {
      displayName = changedNames[key]
    }
  }
  return displayName
}

export const parseTopic = (topicName, changedNames) => {
  
  let displayName = topicName;
  for (let key in changedNames) {
    if(key === (topicName)) {
      displayName = changedNames[key]
    }
  }
  return displayName
}


export const parseCode = (text) => {
  if (!text) return text;

  const parts = text.split(/(`{3}[\s\S]*?`{3}|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const code = part.slice(3, -3);

      return (
        <pre key={index}>
          <code>{code}</code>
        </pre>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      const code = part.slice(1, -1);
      
      return (
        <code key={index}>{code}</code>
      );
    }

    return part.split("\n").map((line, lineIndex, arr) => (
      <React.Fragment key={`${index}-${lineIndex}`}>
        {line}
        {lineIndex < arr.length - 1 && <br />}
      </React.Fragment>
    ));
  });
};