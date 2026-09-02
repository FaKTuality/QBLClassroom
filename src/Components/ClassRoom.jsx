import { collection, doc, getDocs,getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { db } from "../../Firebase/index.js";
import { useAuth } from "../store/authProvider";
import { Notif } from "./Notif";
import { RevolvingDot } from "react-loader-spinner";
import { useTopicChange, parseTopic, parseCode } from "../Hooks";


const errorMessages = {
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
}



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







export const ClassRoom = () => {
  
  const location = useLocation();
  const topicName = location.state?.topicName;  
  const LQN = location.state?.LQN 
  const studentName = location.state?.studentName
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responseInfo, setResponseInfo] = useState(null);
  const [counter, setCounter] = useState(LQN || 0);
  const [showModal, setShowModal ] = useState(false); 
  const [showNotif, setShowNotif] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [ shuffle, setShuffle ] = useState(false); 
  const storedQNoArr = localStorage.getItem('qNoArr')
  const [ qNoArr, setQNoArr ] = useState(storedQNoArr ? JSON.parse(storedQNoArr) : []);  
  const bookmark = localStorage.getItem(`${qNoArr[counter]}${topicName}`) || null;
  const chosenOption = bookmark? JSON.parse(bookmark).chosenOption : null; 
  const { currentUser: user, loading: authLoading } = useAuth();
  const studentId = user?.uid;

  const lastIndex = questions.length - 1;
  const finalQuestion = counter === lastIndex;
  const changedTopics = useTopicChange(); 


const fisherYates = (array) => {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // destructuring assignment
  }

  return shuffled;
};


  useEffect(() => {
    if (!studentId || !topicName) return;

    const fetchQuestions = async () => {
    
      try {
        setError(null);
        const docRef = doc(db, "users", studentId, "topics", topicName)
        const colRef = collection(
          db,
          `users/${studentId}/topics/${topicName}/questions`
        );

        const [querySnap, docSnap] = await Promise.all([getDocs(colRef), getDoc(docRef)]);
        querySnap.docs.length === LQN && setCounter(LQN - 1); 
        if(docSnap.data().shuffle) {
          let randomized = fisherYates(querySnap.docs)
          if(qNoArr.length === 0){
            const randomizedArr = randomized.map((docSnap) => docSnap.id)
            setQNoArr(randomizedArr)
            localStorage.setItem('qNoArr', JSON.stringify(randomizedArr))            
          } else {
            randomized = qNoArr.map((qNo, index) => randomized.find((docSnap) => docSnap.id === qNo))
                        
          }
          setQuestions(randomized)
        }else {
          let sequential = querySnap.docs
          if(qNoArr.length === 0) {
            const sequentialArr = sequential.map((docSnap) => docSnap.id)
            setQNoArr(sequentialArr)
            localStorage.setItem('qNoArr', JSON.stringify(sequentialArr))          
          } else {
            sequential = qNoArr.map((qNo, index) => sequential.find((docSnap) => docSnap.id === qNo))
            
          }
          setQuestions(sequential);
        }
        setShuffle(docSnap.data().shuffle)  
      } catch (e) {
        setError(
          !navigator.onLine
            ? "You're currently offline. Please reconnect to the internet and try again."
            : errorMessages[e.code] ?? "Something went wrong. Please try again."
        ); 
      } finally {
        setLoading(false);
      }
    };

      fetchQuestions();

    
  }, [studentId, topicName]);

  if (authLoading || loading) {
    return (
      <div className="loader-container">
        <RevolvingDot
          visible={true}
          height="80"
          width="80"
          color="orange"
        />
      </div>
    );
  }

  if (error) {
    return <p className="center_piece">{error}</p>;
  }

  const openModal = () => setShowModal(true);

  const closeModal = () => setShowModal(false);

  const handleClick = (question, option, questionNumber) => {
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
      `${questionNumber}${topicName}`,
      JSON.stringify(answeredQuestion)
    );

    localStorage.setItem(`LQN${topicName}`,counter+1)

    
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const submittedAt = serverTimestamp(); 
    const attemptedQuestions = [];

    questions.forEach((docSnap) => {
      const storedItem = localStorage.getItem(`${docSnap.id}${topicName}`);
      const storedQuestion = storedItem ? JSON.parse(storedItem) : {};

      attemptedQuestions.push({
        ...storedQuestion,
        questionNumber: docSnap.id,
        createdAt: submittedAt
      });
    });



    try {
      setSubmitError(null);

      await Promise.all(
        attemptedQuestions.map((question) =>
          setDoc(
            doc(
              db,
              `users/${studentId}/topics/${topicName}/submissions/${question.questionNumber}`
            ),
            question
          )
        )
      );
    questions.forEach((docSnap) => {
        localStorage.removeItem(`${docSnap.id}${topicName}`)
    });

    localStorage.removeItem(`LQN${topicName}`)
    localStorage.removeItem('qNoArr')     

      setShowNotif(true);
      setTimeout(() => {
        navigate("/navstu/viewtopicsstudent", { state: { userId: studentId, studentName, }});        
      }, 1000)
  
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const next = (questionNumber) => {
    const storedItem = localStorage.getItem(`${questionNumber}${topicName}`)
    
    if(storedItem === null) {
      alert("select an option first")
      return; 
    }
    if (!finalQuestion) {
      setCounter((prev) => prev + 1);
      setResponseInfo(null);
      setShowModal(false);
      
    }
  };

  const previous = (questionNumber) => {
    if (counter !== 0) {
      setCounter((prev) => prev - 1);
      setResponseInfo(null);
      setShowModal(false);
      
    }
  };

  const docSnap = questions[counter];
  const question = docSnap?.data();

  if (!question) return (<div className="center_piece">There are no questions yet. </div>);

  const { additionalMediaType, additionalMediaLink } = question;

  return (
    <div className="center_piece">
      {showNotif && (
        <Notif
          operation="submit-answers"
          setShowNotif={setShowNotif}
        />
      )}


      {submitError && (
        <p className="error-message">{submitError}</p>
      )}

      <h2 className="centered">{parseCode(parseTopic(topicName, changedTopics))}</h2>

      <div className="question-details">
        <div className="q-number">
          Question {counter + 1} of {questions.length}
        </div>

        {additionalMediaType === "video" && (
          <div>
          <iframe
            width="560"
            height="315"
            src={getYouTubeEmbedUrl(additionalMediaLink, { autoplay: true, controls: false})}
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
              onClick={() =>
                handleClick(question, option, docSnap.id)
              }
            >
              <span
                className={`option-text ${
                  chosenOption === option.text
                    ? "selected-option"
                    : ""
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
            <button
              className="close-modal"
              onClick={closeModal}
            >
              &times;
            </button>

            {responseInfo.responseType === "text" && (
              <div><h4 className="header-centered">Read this</h4><div>{responseInfo.responsePayload}</div></div>
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
              width="560"
              height="315"
              src={getYouTubeEmbedUrl(responseInfo.responsePayload, { autoplay: true, controls: false})}
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
          onClick={() => previous(docSnap.id)}
          disabled={counter === 0}
        >
          Previous
        </button>

        {!finalQuestion ? (
          <button
            className="button"
            onClick={() => next(docSnap.id)}
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







