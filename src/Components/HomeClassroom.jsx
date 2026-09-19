import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Notif } from "./Notif";
import { parseCode } from "../Hooks";

const DEMO_KEY_PREFIX = "demoClassroom";
const TOPIC_NAME = "Voltage"; // hardcode your topic display name here

// Fill in your own sample questions here. Each item should look like:
// {
//   id: "question0001",
//   questionText: "...",
//   additionalMediaType: "video" | "image" | "audio" | "",
//   additionalMediaLink: "...",
//   options: [
//     { text: "...", responseType: "text" | "image" | "video" | "audio", responsePayload: "..." },
//     ...
//   ]
// }
const DEMO_QUESTIONS = [
  {
    id: "question0001",
    questionText: "What is a charge?",
    additionalMediaType: "",
    additionalMediaLink: "",
    options: [
      {
        text: "something that certain people have",
        responseType: "image",
        responsePayload: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTlqdnRzb2tocmxmaDFiNmJuNmZyanF4MzJxazR5azQwZGZ3ZzF2eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/JT7Td5xRqkvHQvTdEu/200w.webp",
      },
      {
        text: "the amount of money that is charged for a product",
        responseType: "image",
        responsePayload: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTlqdnRzb2tocmxmaDFiNmJuNmZyanF4MzJxazR5azQwZGZ3ZzF2eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/JOEnREV2UXEyAMJ4BO/200.webp",
      },
      {
        text: "electricity",
        responseType: "text",
        responsePayload: "you're not entirely wrong. a charge is related to electricity",
      },
      {
        text: "a property of certain fundamental particles",
        responseType: "video",
        responsePayload: "https://youtu.be/YEReRb8rDCw?si=D_r5PQU1m7BFyf1h",
      },      
    ],
  },
  {
    id: "question0002",
    questionText: "what is an electric field?",
    additionalMediaType: "image",
    additionalMediaLink: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/VFPt_charges_plus_minus_thumb.svg/500px-VFPt_charges_plus_minus_thumb.svg.png?utm_source=en.wikipedia.org&utm_campaign=parser&utm_content=thumbnail",
    options: [
      {
        text: "an environment where an electric charge resides",
        responseType: "image",
        responsePayload: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTlqdnRzb2tocmxmaDFiNmJuNmZyanF4MzJxazR5azQwZGZ3ZzF2eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/4OJFCEeGzYGs0/200w.webp",
      },
      {
        text: "an open location where electricity is free",
        responseType: "image",
        responsePayload: "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTlqdnRzb2tocmxmaDFiNmJuNmZyanF4MzJxazR5azQwZGZ3ZzF2eCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xVIkfXYGTJeZKilg3p/200w.webp",
      },
      {
        text: "a region around an electric charge, where another electric charge would experience an electric force",
        responseType: "text",
        responsePayload: `Exactly! An electric field is what people call the SPACE around a particle that has a charge (in other words, a charged particle).
        Under a certain condition, a particle within this space will experience a force. The condition is that the particle must possess a charge itself (must be 
        a charged particle)`,
      },
      {
        text: "a place where charging your phone is strictly forbidden",
        responseType: "image",
        responsePayload: "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGxhYjdudWlsZno3ZGI1bDRxaWNqNXowOGswdm5rNWN6c2lnZ2R3cSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6vdxQyAhN3QSva0cow/200w.webp",
      },      
    ],
  },
  {
    id: "question0003",
    questionText: `So far, we know that having a charge allows a particle to have an electric field. \Well having a charge also allows a particle to experience a force in an electric field. \
An important concept to understand is the concept of work. People noticed that an object needed to have something in order for its \
state of motion to change from rest (to get it moving from when it wasn't moving). They called this thing energy. People also noticed\
that it was often supplied by a force. As usual, people would always find a way to measure things \
(I'm taller than you; I'm faster than you etc.), so they found a way to measure energy; since the energy was \
transferred by a force, the energy transferred from the force to the object is the same as the energy possessed by the object after the transfer (the \
amount of money transferred is the same as the balance of the recipient, if they had no money before). The\
amount of energy transferred is called work. so what is worK? `,
    additionalMediaType: "image",
    additionalMediaLink: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Baseball_pitching_motion_2004.jpg/500px-Baseball_pitching_motion_2004.jpg?utm_source=en.wikipedia.org&utm_campaign=parser&utm_content=thumbnail",
    options: [
      {
        text: "the amount of effort used to lift weight",
        responseType: "image",
        responsePayload: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExenc1NWcybnE3eTNkY2Z1dzluaTVidm40bmF5amo2MmlmMTFiOGZsYyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1zSz5MVw4zKg0/200.webp",
      },
      {
        text: "a measure of the amount of energy transferred by an object to a force ",
        responseType: "image",
        responsePayload: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExenc1NWcybnE3eTNkY2Z1dzluaTVidm40bmF5amo2MmlmMTFiOGZsYyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/gnE4FFhtFoLKM/200w.webp",
      },
      {
        text: "a measure of the amount of energy transferred by a force to an object",
        responseType: "image",
        responsePayload: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExbGxxMmZ6aWN2enJ2bWZqZmg2aDRhbzBwMDFtN2dpb2VtM3BsNHZ6diZlcD12MV9naWZzX3NlYXJjaCZjdD1n/MNmyTin5qt5LSXirxd/200w.webp",
      },
      {
        text: "a measure of the amount of energy transferred",
        responseType: "text",
        responsePayload: "Read the question again, carefully",
      },      
    ],
  },

];

const getWikimediaCommonsFileUrl = (trimmedUrl) => {
  const wikiRegex = /^https?:\/\/commons\.wikimedia\.org\/wiki\/File:(.+)$/i;
  const match = trimmedUrl.match(wikiRegex);
  if (!match || !match[1]) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(match[1])}`;
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

const getDirectImageUrl = (url) => {
  if (!url || typeof url !== "string") return "";

  const trimmedUrl = url.trim();

  const giphyRegex = /^https?:\/\/(?:www\.)?giphy\.com\/gifs\/(?:[\w-]+-)?([a-zA-Z0-9]+)\/?$/i;
  const giphyMatch = trimmedUrl.match(giphyRegex);
  if (giphyMatch && giphyMatch[1]) {
    return `https://i.giphy.com/media/${giphyMatch[1]}/giphy.gif`;
  }

  const imgurRegex = /^https?:\/\/imgur\.com\/([a-zA-Z0-9]+)(?:\..+)?$/i;
  const imgurMatch = trimmedUrl.match(imgurRegex);
  if (imgurMatch && imgurMatch[1]) {
    return `https://i.imgur.com/${imgurMatch[1]}.png`;
  }

  const gDriveRegex = /^https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i;
  const gDriveMatch = trimmedUrl.match(gDriveRegex);
  if (gDriveMatch && gDriveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gDriveMatch[1]}`;
  }

  const wikiUrl = getWikimediaCommonsFileUrl(trimmedUrl);
  if (wikiUrl) return wikiUrl;

  return isSafeHttpUrl(trimmedUrl) ? trimmedUrl : "";
};

const getDirectAudioUrl = (url) => {
  if (!url || typeof url !== "string") return "";

  const trimmedUrl = url.trim();

  const gDriveRegex = /^https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i;
  const gDriveMatch = trimmedUrl.match(gDriveRegex);
  if (gDriveMatch && gDriveMatch[1]) {
    return `https://docs.google.com/uc?export=download&id=${gDriveMatch[1]}`;
  }

  if (trimmedUrl.includes("dropbox.com/")) {
    try {
      const dropboxUrl = new URL(trimmedUrl);
      dropboxUrl.searchParams.delete("dl");
      dropboxUrl.searchParams.set("raw", "1");
      return dropboxUrl.toString();
    } catch {
    }
  }

  const vocarooRegex = /^https?:\/\/(?:www\.)?(?:vocaroo\.com|voca\.ro)\/([a-zA-Z0-9]+)/i;
  const vocarooMatch = trimmedUrl.match(vocarooRegex);
  if (vocarooMatch && vocarooMatch[1]) {
    return `https://media.vocaroo.com/mp3/${vocarooMatch[1]}`;
  }

  const wikiUrl = getWikimediaCommonsFileUrl(trimmedUrl);
  if (wikiUrl) return wikiUrl;

  return isSafeHttpUrl(trimmedUrl) ? trimmedUrl : "";
};

const fisherYates = (array) => {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // destructuring assignment
  }

  return shuffled;
};

// Wipes every demo answer key plus the demo question-order key.
const clearDemoStorage = (questions) => {
  questions.forEach((question) => {
    localStorage.removeItem(`${DEMO_KEY_PREFIX}-${question.id}-${TOPIC_NAME}`);
  });
  localStorage.removeItem(`${DEMO_KEY_PREFIX}-qNoArr`);
};

export const DemoClassRoom = () => {
  const navigate = useNavigate();

  // Shuffled fresh on every mount — never persisted, never the same order twice.
  const [questions] = useState(() => fisherYates(DEMO_QUESTIONS));
  const [counter, setCounter] = useState(0);
  const [responseInfo, setResponseInfo] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const question = questions[counter];
  const lastIndex = questions.length - 1;
  const finalQuestion = counter === lastIndex;

  const bookmark = question
    ? localStorage.getItem(`${DEMO_KEY_PREFIX}-${question.id}-${TOPIC_NAME}`)
    : null;
  const chosenOption = bookmark ? JSON.parse(bookmark).chosenOption : null;

  // Clears demo answer state on unmount, same as on submit.
  useEffect(() => {
    return () => {
      clearDemoStorage(questions);
    };
  }, [questions]);

  if (!question) {
    return <div className="center_piece">There are no questions yet.</div>;
  }

  const openModal = () => setShowModal(true);

  const closeModal = () => setShowModal(false);

  const handleClick = (question, option) => {
    setResponseInfo({
      responseType: option.responseType,
      responsePayload: option.responsePayload,
    });

    openModal();

    const answeredQuestion = {
      ...question,
      chosenOption: option.text,
      responseType: option.responseType,
    };

    localStorage.setItem(
      `${DEMO_KEY_PREFIX}-${question.id}-${TOPIC_NAME}`,
      JSON.stringify(answeredQuestion)
    );
  };

  const handleSubmit = () => {
    setSubmitting(true);

    clearDemoStorage(questions);

    setShowNotif(true);
    setTimeout(() => {
      setSubmitting(false);
      navigate("/#home");
    }, 1000);
  };

  const next = (questionId) => {
    const storedItem = localStorage.getItem(`${DEMO_KEY_PREFIX}-${questionId}-${TOPIC_NAME}`);

    if (storedItem === null) {
      alert("select an option first");
      return;
    }
    if (!finalQuestion) {
      setCounter((prev) => prev + 1);
      setResponseInfo(null);
      setShowModal(false);
    }
  };

  const previous = () => {
    if (counter !== 0) {
      setCounter((prev) => prev - 1);
      setResponseInfo(null);
      setShowModal(false);
    }
  };

  const { additionalMediaType, additionalMediaLink } = question;

  return (
    <div className="center_piece">
      {showNotif && (
        <Notif
          operation="submit-answers"
          setShowNotif={setShowNotif}
        />
      )}

      <h2 className="centered">{parseCode(TOPIC_NAME)}</h2>

      <div className="question-details">
        <div className="q-number">
          Question {counter + 1} of {questions.length}
        </div>

        {additionalMediaType === "video" && (
          <div>
            <iframe
              width="560"
              height="315"
              src={getYouTubeEmbedUrl(additionalMediaLink, { autoplay: true, controls: false })}
              title="YouTube video player"
              frameBorder="0"
              autoplay={true}
            >
            </iframe>
          </div>
        )}

        {additionalMediaType === "image" && (
          <img
            className="q-media centered"
            src={getDirectImageUrl(additionalMediaLink)}
            alt=""
          />
        )}

        {additionalMediaType === "audio" && (
          <audio
            className="q-media"
            src={getDirectAudioUrl(additionalMediaLink)}
            controls
          />
        )}

        <div className="q-text">{parseCode(question.questionText)}</div>

        <ul className="list">
          {question.options.map((option) => (
            <li
              key={option.text}
              className="listItem"
              style={{ cursor: "pointer" }}
              onClick={() => handleClick(question, option)}
            >
              <span
                className={`option-text ${
                  chosenOption === option.text ? "selected-option" : ""
                }`}
              >
                {parseCode(option.text)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {showModal && responseInfo && (
        <div className="modal" onClick={closeModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {responseInfo.responseType === "text" && (
              <div><div>{responseInfo.responsePayload}</div></div>
            )}

            {responseInfo.responseType === "image" && (
              <img
                className="q-media"
                src={getDirectImageUrl(responseInfo.responsePayload)}
                alt=""
              />
            )}

            {responseInfo.responseType === "video" && (
              <iframe
                width="100%"
                height="100%"
                src={getYouTubeEmbedUrl(responseInfo.responsePayload, { autoplay: true, controls: false })}
                title="YouTube video player"
                frameBorder="0"
              >
              </iframe>
            )}

            {responseInfo.responseType === "audio" && (
              <audio
                className="q-media"
                src={getDirectAudioUrl(responseInfo.responsePayload)}
                controls
              />
            )}
          </div>
        </div>
      )}

      <div className="buttonPair button-pair-exception">
        <button
          className="button"
          onClick={previous}
          disabled={counter === 0}
        >
          Previous
        </button>

        {!finalQuestion ? (
          <button
            className="button"
            onClick={() => next(question.id)}
          >
            Next
          </button>
        ) : (
          <button
            className="button"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        )}
      </div>
    </div>
  );
};