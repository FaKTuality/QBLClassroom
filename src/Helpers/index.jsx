
import React from "react";
import * as Yup from "yup";

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



// ─────────────────────────────────────────────────────────────────────────────
// Add to Helpers/index.jsx
//
// 1. Add this import at the top of Helpers/index.jsx (if it isn't there already):
//      import * as Yup from "yup";
// 2. Paste everything below into the file (anywhere after the imports).
//
// These are shared by every QuestionForm variant. The ClassRoom components can
// import DEFAULT_PENALTY_DELAY / normalizeQuestion too, so questions saved
// before this feature existed (no isCorrect, no penaltyDelay) keep working.
// ─────────────────────────────────────────────────────────────────────────────

// Seconds a student must wait after picking a wrong option.
// 8 matches the old global SELECTION_COOLDOWN in ClassRoom.
export const DEFAULT_PENALTY_DELAY = 8;
export const MAX_PENALTY_DELAY = 300; // 10 minutes; guards against typos like 8000

export const createEmptyOption = () => ({
  text: "",
  responseType: "",
  responsePayload: "",
  isCorrect: false,
});

export const createEmptyQuestion = () => ({
  additionalMediaType: "",
  additionalMediaLink: "",
  questionText: "",
  penaltyDelay: DEFAULT_PENALTY_DELAY,
  options: [createEmptyOption()],
});

// Accepts a saved question, a restored draft, or null/undefined, and returns a
// complete form-ready object. Fills in the fields older questions don't have so
// Formik inputs are always controlled and the checkboxes always have a boolean.
export const normalizeQuestion = (question) => {
  const base = createEmptyQuestion();
  if (!question) return base;

  const options =
    Array.isArray(question.options) && question.options.length > 0
      ? question.options
      : base.options;

  return {
    ...base,
    ...question,
    penaltyDelay: question.penaltyDelay ?? DEFAULT_PENALTY_DELAY,
    options: options.map((option) => ({ ...createEmptyOption(), ...option })),
  };
};

// Returns a new options array in which only `index` is correct. Clicking the
// option that is already correct clears it, so the tutor can undo a mistake.
export const markCorrectOption = (options, index) =>
  options.map((option, i) => ({
    ...option,
    isCorrect: i === index ? !option.isCorrect : false,
  }));

export const questionValidationSchema = Yup.object().shape({
  additionalMediaType: Yup.string(),
  additionalMediaLink: Yup.string().when("additionalMediaType", {
    is: (additionalMediaType) => !!additionalMediaType,
    then: (schema) => schema.required("Please provide a link to the additional media"),
    otherwise: (schema) => schema.notRequired(),
  }),
  questionText: Yup.string().required("please enter a question"),
  penaltyDelay: Yup.number()
    .typeError("please enter the delay in seconds")
    .integer("the delay must be a whole number of seconds")
    .min(0, "the delay can't be negative")
    .max(MAX_PENALTY_DELAY, `the delay can't be more than ${MAX_PENALTY_DELAY} seconds`)
    .required("please set a delay (0 for none)"),
  options: Yup.array()
    .of(
      Yup.object({
        text: Yup.string().required("please enter a response"),
        responseType: Yup.string().required("please choose a response type"),
        responsePayload: Yup.string().required("please enter a response text or link"),
        isCorrect: Yup.boolean(),
      })
    )
    .min(2, "A question must have at least two options")
    .test(
      "exactly-one-correct",
      "Mark exactly one option as the correct answer",
      (options) => (options || []).filter((option) => option?.isCorrect).length === 1
    ),
});


export const hasAnswerKey = (question) =>
  Array.isArray(question?.options) &&
  question.options.some((option) => option.isCorrect === true);
 
export const isWrongChoice = (question, option) =>
  hasAnswerKey(question) && option.isCorrect !== true;
 
export const getPenaltySeconds = (question) =>
  Number.isFinite(question?.penaltyDelay) ? question.penaltyDelay : DEFAULT_PENALTY_DELAY;