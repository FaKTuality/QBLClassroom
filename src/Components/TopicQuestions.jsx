import { getDocs, deleteDoc, collection } from "firebase/firestore";
import { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom"
import { TopicConfig } from "./TopicConfig";
import { Notif } from "./Notif";
import { db } from "../../Firebase/index.js";
import { RevolvingDot } from "react-loader-spinner";
import { useNameChange, parseName } from "../Hooks";
import { useTopicChange, parseTopic, parseCode } from "../Hooks";


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
};


export const TopicQuestions = ( )=> {
  const location = useLocation(); 
  const navigate = useNavigate(); 
  const topicInfo = location.state;
  const [selected, setSelected] = useState('')
  const [responseInfo, setResponseInfo] = useState(null);
  const [ showNotif, setShowNotif ] = useState(false)
  const [ showModal, setShowModal ] = useState(false); 
  const [ loading, setLoading ] = useState(true); 
  const [ error, setError ] = useState(null); 
  const [ querySnap, setQuerySnap ] = useState([]); 
  const [ deleting, setDeleting ] = useState(false); 
  const [ editing, setEditing ] = useState(false); 
  const [ update, setUpdate ] = useState(); 
  const [ showOptions, setShowOptions ] = useState({
    id: null,
    show: null,
  });
  const [ showMedia, setShowMedia ] = useState(false); 
  const changedNames = useNameChange(); 
  const changedTopics = useTopicChange(); 
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setError(null)
        const colRef = collection(db, `users/${topicInfo.studentId}/topics/${topicInfo.topicName}/questions`);
        const querySnap = await getDocs(colRef) ;
         
        setQuerySnap(querySnap); 
      } catch(e) {
        setError(
          !navigator.onLine
            ? "You're currently offline. Please reconnect to the internet and try again."
            : errorMessages[e.code] ?? "Something went wrong. Please try again."
        );
      } finally {
        setLoading(false); 
      }
    }
    fetchQuestions(); 
  }, [topicInfo.studentId, topicInfo.topicName, showModal, showNotif])

  if(loading) {
    return (
      <div className="loader-container">
      <RevolvingDot 
        visible={true}
        height="80"
        width="80"
        color="orange"
      />
      </div>)
  }
  if (error) {
    return <p className="center_piece">{error}</p>
  }




  const handleEdit = (questionInfo) => {
    const topicConfigSerial = JSON.stringify({ 
      topicName: topicInfo.topicName,
      students: topicInfo.students, 
      studentId: topicInfo.studentId,
      name: topicInfo.name, 
      isEditing: true,
    })
    localStorage.setItem("topicConfig", topicConfigSerial);
    const questionInfoSerial = JSON.stringify(questionInfo); 
    localStorage.setItem('questionInfo', questionInfoSerial);
    setEditing(true); 
    
  }

  const handleDelete = async (questionNumber) => {
    const topicConfigSerial = JSON.stringify({ 
      topicName: topicInfo.topicName,
      students: topicInfo.students,
      isDeleting: true,
    })
    localStorage.setItem("topicConfig", topicConfigSerial);    
    const questionInfoSerial = JSON.stringify({ questionNumber })
    localStorage.setItem('questionInfo', questionInfoSerial)
    setDeleting(true); 
  }


  const handleShowOptions = (questionNumber) => {
    setShowOptions({
      id: questionNumber, 
      show: showOptions.id === questionNumber || showOptions.show === null ? !showOptions.show : showOptions.show

    })
  }

  const randomClick = () => {
    setShowOptions({
      id: null, 
      show: showOptions.show, 
    }
    )
  }


  const handleClick = (option) => {
    setResponseInfo({
      responseType: option.responseType,
      responsePayload: option.responsePayload,
    });

    setSelected(option.text)
    setShowMedia(true);

  };




  return(
    <>
      <div className="center_piece">
        {<h2 className="centered">Questions under {parseCode(parseTopic(topicInfo.topicName, changedTopics))} for {parseName(topicInfo.name, topicInfo.studentId , changedNames)}</h2>}
        {showNotif && <Notif operation={"delete"} setShowNotif={setShowNotif}/>}
        {querySnap.docs.length === 0 ? 
        <p className="centered">No questions have been added to this topic</p>
      
      
      :querySnap.docs.map((docSnap, index)=> {

          const additionalMediaLink = docSnap.data().additionalMediaLink
          const additionalMediaType = docSnap.data().additionalMediaType

           
          return(
            <div key={docSnap.id}>
              <div className="question-details" onClick={randomClick}>
                <div className="three-dots"
                  onClick={(e) => {
                    e.stopPropagation(); 
                    handleShowOptions(docSnap.id)
                  }}
                >⋮</div>
                <div className="q-number">{ `question ${index + 1}` }</div>
                { additionalMediaType === 'video' && 
                  <video 
                    className="q-media" 
                    src={additionalMediaLink} controls/>
                }

                { additionalMediaType === "image" && 
                  <img 
                    className="q-media centered" 
                    src={additionalMediaLink} />}

                { additionalMediaType === "audio" && 
                  <audio 
                    className="q-media"
                    src={additionalMediaLink} 
                    controls/>}
                <div className="q-text">{parseCode(docSnap.data().questionText)}</div>
                <ul className="list">
                  { docSnap.data().options.map((option) => 
                    <li key={option.text} 
                      className={`option flex-hori-no-center`} style={{cursor: 'pointer'}} 
                      onClick={() => handleClick(option)}><span className="response-type">{option.responseType}</span>&nbsp;
                    <span className={`option-text ${selected === option.text && 'selected-option'}`}>{parseCode(option.text)}</span></li>
                  )}
                </ul>
                <div className={` ${showOptions.id === docSnap.id && showOptions.show ? 'action-group' : 'hidden'}`}>
                  <div className="action" onClick={()=> {handleEdit({ questionData: docSnap.data(), questionNumber: docSnap.id})}}>Edit</div>
                  <div className="action" onClick={() => {handleDelete(docSnap.id)}}>Delete</div>
                </div>                
              </div>

          </div> 
          )}
        )}

         {editing && <TopicConfig setShowModal={setEditing} setShowNotif={setShowNotif} setQuerySnap={setQuerySnap} editing={true} />  }
         {deleting && <TopicConfig setShowModal={setDeleting} setShowNotif={setShowNotif} setQuerySnap={setQuerySnap} deletingQuestion={true} />  }
      {showMedia && responseInfo && (
        <div className="modal" onClick={() => setShowMedia(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal"
              onClick={() => setShowMedia(false)}
            >
              &times;
            </button>

            {responseInfo.responseType === "text" && (
              <p>{responseInfo.responsePayload}</p>
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

      </div>
    </>
  )
}


